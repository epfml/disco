import "@/buffer-polyfill";
import * as tf from "@tensorflow/tfjs";
import {
  Dataset,
  DecentralizedClient,
  Disco,
  Image,
  deserializeTaskFromJSON,
  modelEncode,
  getAggregator,
  split,
} from "@epfml/discojs";
import type { DataFormat, DataType, Network, Task } from "@epfml/discojs";
import { workerPeerFactory } from "./peer_transport";
import type { FromWorker, ToWorker } from "./worker_messages";

const send = (message: FromWorker): void => {
  const bytes = message.type === "finished" ? message.model : undefined;
  self.postMessage(message, {
    transfer: bytes?.buffer instanceof ArrayBuffer ? [bytes.buffer] : [],
  });
};
let stopRequested = false;
let nextRequestId = 0;
let nextStreamId = 0;
const pending = new Map<
  number,
  (message: Extract<ToWorker, { type: "data" }>) => void
>();
function dataset<D extends DataType>(dataType: D): Dataset<DataFormat.Raw[D]> {
  return new Dataset(async function* () {
    const streamId = nextStreamId++;
    for (;;) {
      if (stopRequested) return;
      const requestId = nextRequestId++;
      const response = new Promise<Extract<ToWorker, { type: "data" }>>(
        (resolve) => pending.set(requestId, resolve),
      );
      send({ type: "data-request", requestId, streamId });
      const { samples, done } = await response;
      for (const sample of samples) {
        if (stopRequested) return;
        if (dataType === "image") {
          const [raw, label] = sample as DataFormat.Raw["image"];
          const image = new Image(raw.data, raw.width, raw.height, raw.depth);
          yield [image, label] as DataFormat.Raw[D];
        } else {
          yield sample as DataFormat.Raw[D];
        }
      }
      if (done) return;
    }
  });
}

async function train(
  message: Extract<ToWorker, { type: "start" }>,
): Promise<void> {
  let disco: Disco<DataType, Network> | undefined;
  let stopped = false;
  try {
    const task = (await deserializeTaskFromJSON(message.task)) as Task<
      DataType,
      Network
    >;
    const webglReady = await tf.setBackend("webgl").catch(() => false);
    if (!webglReady) await tf.setBackend("cpu");
    await tf.ready();
    const url = new URL(message.serverUrl);
    let client;
    if (message.scheme === "decentralized") {
      if (message.peerPort === undefined)
        throw new Error("missing peer transport");
      client = new DecentralizedClient(
        url,
        task as Task<DataType, "decentralized">,
        getAggregator(task),
        workerPeerFactory(message.peerPort),
      );
    }
    disco = new Disco(task, client ?? url, { scheme: message.scheme });
    disco.on("status", (status) => send({ type: "status", status }));
    disco.on("participants", (count) => send({ type: "participants", count }));

    for await (const round of disco.train(dataset(task.dataType))) {
      const [roundGenerator, roundLogs] = split(round);
      for await (const epoch of roundGenerator) {
        const [epochGenerator, epochLogs] = split(epoch);
        for await (const log of epochGenerator) {
          send({ type: "batch", log });
          if (stopRequested) break;
        }
        if (stopRequested) {
          stopped = true;
          break;
        }
        const log = await epochLogs;
        send({
          type: "epoch",
          batches: log.batches.toArray(),
          epochTime: log.epochTime,
          validation: log.validation,
        });
      }
      if (stopRequested) {
        stopped = true;
        break;
      }
      const log = await roundLogs;
      send({
        type: "round",
        participants: log.participants,
        preRoundValidation: log.preRoundValidation,
        postAggregationValidation: log.postAggregationValidation,
      });
    }
    const model = disco.trainer.releaseModel();
    let encoded: Uint8Array | undefined;
    try {
      encoded = model === undefined ? undefined : await modelEncode(model);
    } finally {
      model?.dispose();
    }
    const finishedDisco = disco;
    disco = undefined;
    await finishedDisco.close();
    send({ type: "finished", stopped, model: encoded });
  } catch (error) {
    send({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
    });
  } finally {
    await disco?.close().catch(() => undefined);
  }
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  if (message.type === "start") void train(message);
  else if (message.type === "stop") stopRequested = true;
  else if (message.type === "data") {
    pending.get(message.requestId)?.(message);
    pending.delete(message.requestId);
  }
};

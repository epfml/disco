import "@/buffer-polyfill";
import * as tf from "@tensorflow/tfjs";
import {
  DecentralizedClient,
  Disco,
  deserializeTaskFromJSON,
  modelEncode,
  getAggregator,
  split,
} from "@epfml/discojs";
import type { DataType, Network, Task } from "@epfml/discojs";
import { workerPeerFactory } from "./peer_transport";
import { loadDataset } from "../dataset_input/source";
import type { FromWorker, ToWorker } from "./worker_messages";

const send = (message: FromWorker): void => {
  const bytes = message.type === "finished" ? message.model : undefined;
  self.postMessage(message, {
    transfer: bytes?.buffer instanceof ArrayBuffer ? [bytes.buffer] : [],
  });
};
let stopRequested = false;
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
    if (message.dataset.type !== task.dataType)
      throw new Error("Dataset type does not match task");
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

    for await (const round of disco.train(loadDataset(message.dataset))) {
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
};

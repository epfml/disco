import "@/buffer-polyfill";
import * as tf from "@tensorflow/tfjs";
import {
  ClientDisconnectedError,
  DecentralizedClient,
  Disco,
  deserializeTaskFromJSON,
  modelEncode,
  getAggregator,
  getClient,
  split,
} from "@epfml/discojs";
import type { DataType, Network, Task } from "@epfml/discojs";
import { workerPeerFactory } from "./peer_transport";
import { loadDataset } from "../dataset_input/source";
import type { FromWorker, ToWorker } from "./worker_messages";

function send(message: FromWorker): void {
  const bytes =
    message.type === "finished" || message.type === "error"
      ? message.model
      : undefined;
  self.postMessage(message, {
    transfer: bytes?.buffer instanceof ArrayBuffer ? [bytes.buffer] : [],
  });
}

async function releaseAndEncodeModel(
  disco: Disco<DataType, Network> | undefined,
): Promise<Uint8Array | undefined> {
  const model = disco?.trainer.releaseModel();
  try {
    return model === undefined ? undefined : await modelEncode(model);
  } finally {
    model?.dispose();
  }
}

let stopRequested = false;
let activeDisco: Disco<DataType, Network> | undefined;

async function train(
  message: Extract<ToWorker, { type: "start" }>,
): Promise<void> {
  let disco: Disco<DataType, Network> | undefined;
  let stopped = false;
  let encoded: Uint8Array | undefined;
  try {
    const task = (await deserializeTaskFromJSON(message.task)) as Task<
      DataType,
      Network
    >;
    if (message.datasetSource.type !== task.dataType)
      throw new Error("Dataset type does not match task");
    const webglReady = await tf.setBackend("webgl").catch(() => false);
    if (!webglReady) await tf.setBackend("cpu");
    await tf.ready();
    const url = new URL(message.serverUrl);
    const aggregator = getAggregator(task, { scheme: message.scheme });
    let client;
    // built here rather than by Disco to give it the token of a private task
    if (message.scheme === "decentralized") {
      if (message.peerPort === undefined)
        throw new Error("missing peer transport");
      client = new DecentralizedClient(
        url,
        task as Task<DataType, "decentralized">,
        aggregator,
        message.token,
        workerPeerFactory(message.peerPort),
      );
    } else
      client = getClient(message.scheme, url, task, aggregator, message.token);
    disco = new Disco(task, client, { scheme: message.scheme });
    activeDisco = disco;
    if (stopRequested) disco.requestStop();
    disco.on("status", (status) => send({ type: "status", status }));
    disco.on("participants", (count) => send({ type: "participants", count }));

    training: for await (const round of disco.train(
      loadDataset(message.datasetSource),
    )) {
      const [roundGenerator, roundLogs] = split(round);
      for await (const epoch of roundGenerator) {
        const [epochGenerator, epochLogs] = split(epoch);
        for await (const log of epochGenerator) {
          send({ type: "batch", log });
          if (stopRequested) {
            stopped = true;
            break training;
          }
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
        break training;
      }
      const log = await roundLogs;
      send({
        type: "round",
        participants: log.participants,
        preRoundValidation: log.preRoundValidation,
        postAggregationValidation: log.postAggregationValidation,
      });
    }
    encoded = await releaseAndEncodeModel(disco);
    send({ type: "finished", stopped, model: encoded });
  } catch (error) {
    // A connection failure can leave useful training progress. Return the partial
    // model so users can still save it, while reporting the original error.
    encoded ??= await releaseAndEncodeModel(disco).catch(() => undefined);
    if (stopRequested && error instanceof ClientDisconnectedError)
      send({ type: "finished", stopped: true, model: encoded });
    else
      send({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : undefined,
        model: encoded,
      });
  } finally {
    // Return the model before slow peer cleanup, then let the page terminate us.
    let cleanupError: string | undefined;
    try {
      await disco?.close();
    } catch (error) {
      cleanupError = error instanceof Error ? error.message : String(error);
    }
    activeDisco = undefined;
    send({ type: "closed", error: cleanupError });
  }
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  if (message.type === "start") void train(message);
  else if (message.type === "stop") {
    stopRequested = true;
    activeDisco?.requestStop();
    send({ type: "stopping" });
  }
};

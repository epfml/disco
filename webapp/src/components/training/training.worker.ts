import "@/buffer-polyfill";
import { initializeTrainingBackend } from "./worker_backend";
import {
  Dataset,
  Client,
  Disco,
  Image,
  deserializeTaskFromJSON,
  modelEncode,
  modelDecode,
  getAggregator,
  weightsEncode,
  weightsDecode,
  split,
} from "@epfml/discojs";
import type {
  DataFormat,
  DataType,
  Network,
  Task,
  WeightsContainer,
} from "@epfml/discojs";
import type { FromWorker, ToWorker } from "./worker_messages";

const send = (message: FromWorker): void => {
  const bytes =
    message.type === "network-request" ? message.weights : undefined;
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
const pendingNetwork = new Map<
  number,
  (message: Extract<ToWorker, { type: "network-response" }>) => void
>();

class PageClient extends Client<"decentralized"> {
  constructor(url: URL, task: Task<DataType, "decentralized">) {
    super(url, task, getAggregator(task));
  }

  private async request(
    operation: Extract<FromWorker, { type: "network-request" }>["operation"],
    weights?: Uint8Array,
  ): Promise<Extract<ToWorker, { type: "network-response" }>> {
    const requestId = nextRequestId++;
    const response = new Promise<
      Extract<ToWorker, { type: "network-response" }>
    >((resolve) => pendingNetwork.set(requestId, resolve));
    send({ type: "network-request", requestId, operation, weights });
    const message = await response;
    if (message.error !== undefined)
      throw Object.assign(new Error(message.error), {
        name: message.errorName ?? "Error",
      });
    return message;
  }

  override async connect() {
    const { model } = await this.request("connect");
    if (model === undefined) throw new Error("missing model from page");
    return modelDecode(model);
  }

  override async onRoundBeginCommunication(): Promise<void> {
    const { syncedWeights } = await this.request("begin");
    if (syncedWeights !== undefined) {
      const weights = weightsDecode(syncedWeights);
      try {
        this.emit("modelSynced", weights);
      } finally {
        weights.dispose();
      }
    }
  }

  override async onRoundEndCommunication(
    weights: WeightsContainer,
  ): Promise<WeightsContainer> {
    const { weights: result } = await this.request(
      "end",
      await weightsEncode(weights),
    );
    if (result === undefined)
      throw new Error("missing aggregated weights from page");
    return weightsDecode(result);
  }

  override finishRound(): void {
    // The page client finishes the round before returning aggregated weights.
  }

  override async disconnect(): Promise<void> {
    await this.request("disconnect");
  }

  receiveEvent(message: Extract<ToWorker, { type: "network-event" }>): void {
    if (message.event === "status") this.emit("status", message.status);
    else this.nbOfParticipants = message.count;
  }
}

let pageClient: PageClient | undefined;

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
    await initializeTrainingBackend(task.dataType);
    if (message.scheme === "decentralized") {
      pageClient = new PageClient(
        new URL(message.serverUrl),
        task as Task<DataType, "decentralized">,
      );
    }
    disco = new Disco(task, pageClient ?? new URL(message.serverUrl), {
      scheme: message.scheme,
    });
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
    pageClient = undefined;
  }
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  if (message.type === "start") void train(message);
  else if (message.type === "stop") stopRequested = true;
  else if (message.type === "data") {
    pending.get(message.requestId)?.(message);
    pending.delete(message.requestId);
  } else if (message.type === "network-response") {
    pendingNetwork.get(message.requestId)?.(message);
    pendingNetwork.delete(message.requestId);
  } else if (message.type === "network-event")
    pageClient?.receiveEvent(message);
};

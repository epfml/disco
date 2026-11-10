import * as tf from "@tensorflow/tfjs";
import { List, Set } from "immutable";

import type { Aggregator } from "#aggregator/index";
import { getAggregator } from "#aggregator/index";
import { Dataset } from "#dataset/index";
import type { Batched } from "#dataset/index";
import type {
  BatchLogs,
  EpochLogs,
  GoldfishLossConfig,
  Model,
  ValidationMetrics,
} from "#models/index";
import type { NormalizedImage } from "#processing/image";
import {
  deserializeTaskFromJSON,
  modelDecode,
  weightsDecode,
  weightsEncode,
} from "#serialization/index";
import type {
  AggregatedResult,
  FromComputeWorker,
  SerializedBatch,
  ToComputeWorker,
} from "#training/compute_messages";
import type { IterationTrainableTextModel } from "#training/types";
import type { DataFormat, DataType } from "#types/index";
import type { WeightsContainer } from "#weights/index";

class StopTrainingError extends Error {
  constructor() {
    super("training stopped");
  }
}

let backendReady: Promise<void> | undefined;
let aggregator: Aggregator | undefined;
let model: Model<DataType> | undefined;
let pendingAggregationWeights: WeightsContainer | undefined;

let nextDatasetReqId = 1;
const pendingDatasetRequests = new Map<
  number,
  {
    resolve: (msg: Extract<ToComputeWorker, { type: "dataset-batch" }>) => void;
    reject: (reason: unknown) => void;
  }
>();
const stoppedRequests = new globalThis.Set<number>();

function post(message: FromComputeWorker): void {
  self.postMessage(message);
}

async function ensureBackend(): Promise<void> {
  if (backendReady !== undefined) return backendReady;
  backendReady = (async () => {
    const webglReady = await tf.setBackend("webgl").catch(() => false);
    if (!webglReady) await tf.setBackend("cpu");
    await tf.ready();
  })();
  return backendReady;
}

function deserializeBatch<D extends DataType>(
  dataType: D,
  batch: SerializedBatch,
): Batched<DataFormat.ModelEncoded[D]> {
  switch (dataType) {
    case "image":
      return List(
        (batch as Array<[SerializedBatch[number][0], number]>).map(
          ([img, label]) =>
            [
              img as unknown as NormalizedImage<3>,
              label,
            ] as DataFormat.ModelEncoded["image"],
        ),
      ) as Batched<DataFormat.ModelEncoded[D]>;
    case "tabular":
    case "text":
      return List(
        (batch as Array<[number[], number]>).map(
          ([row, label]) =>
            [List(row), label] as
              | DataFormat.ModelEncoded["tabular"]
              | DataFormat.ModelEncoded["text"],
        ),
      ) as Batched<DataFormat.ModelEncoded[D]>;
  }
}

async function pullNextBatch<D extends DataType>(
  dataType: D,
  iteratorId: number,
  reset?: boolean,
  trainRequestId?: number,
): Promise<IteratorResult<Batched<DataFormat.ModelEncoded[D]>>> {
  if (trainRequestId !== undefined && stoppedRequests.has(trainRequestId)) {
    throw new StopTrainingError();
  }
  const reqId = nextDatasetReqId++;
  const response = await new Promise<
    Extract<ToComputeWorker, { type: "dataset-batch" }>
  >((resolve, reject) => {
    pendingDatasetRequests.set(reqId, { resolve, reject });
    post({
      type: "dataset-next",
      requestId: reqId,
      iteratorId,
      reset,
    });
  });
  if (trainRequestId !== undefined && stoppedRequests.has(trainRequestId)) {
    throw new StopTrainingError();
  }
  if (response.done || response.batch === undefined) {
    return { value: undefined, done: true };
  }
  return {
    value: deserializeBatch(dataType, response.batch),
    done: false,
  };
}

function createRemoteDataset<D extends DataType>(
  dataType: D,
  iteratorId: number,
  trainRequestId?: number,
): Dataset<Batched<DataFormat.ModelEncoded[D]>> {
  return new Dataset({
    async *[Symbol.asyncIterator]() {
      let first = true;
      for (;;) {
        const next = await pullNextBatch(
          dataType,
          iteratorId,
          first,
          trainRequestId,
        );
        first = false;
        if (next.done) break;
        yield next.value;
      }
    },
  });
}

async function flushAggregatedResult(): Promise<AggregatedResult | undefined> {
  if (aggregator === undefined || pendingAggregationWeights === undefined) {
    return undefined;
  }
  const ws = pendingAggregationWeights;
  pendingAggregationWeights = undefined;
  try {
    const encoded = await weightsEncode(ws);
    return {
      weights: encoded,
      round: aggregator.round,
      communicationRound: aggregator.communicationRound,
    };
  } finally {
    ws.dispose();
  }
}

async function handleAggregatorMessage(msg: ToComputeWorker): Promise<void> {
  await ensureBackend();
  switch (msg.type) {
    case "init-aggregator": {
      try {
        const task = await deserializeTaskFromJSON(msg.task);
        aggregator?.dispose();
        pendingAggregationWeights?.dispose();
        pendingAggregationWeights = undefined;
        aggregator = getAggregator(task, {
          scheme: msg.scheme,
        });
        aggregator.on("aggregation", (weights) => {
          pendingAggregationWeights?.dispose();
          pendingAggregationWeights = weights;
        });
        post({
          type: "response",
          requestId: msg.requestId,
          round: aggregator.round,
          communicationRound: aggregator.communicationRound,
        });
      } catch (e) {
        post({
          type: "response",
          requestId: msg.requestId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      break;
    }
    case "aggregator-set-nodes": {
      aggregator?.setNodes(Set(msg.nodes));
      break;
    }
    case "aggregator-register-node": {
      aggregator?.registerNode(msg.nodeId);
      break;
    }
    case "aggregator-remove-node": {
      aggregator?.removeNode(msg.nodeId);
      break;
    }
    case "aggregator-set-round": {
      aggregator?.setRound(msg.round);
      break;
    }
    case "aggregator-make-payloads": {
      try {
        if (aggregator === undefined) {
          throw new Error("aggregator not initialized");
        }
        const weights = weightsDecode(msg.weights);
        let payloadsMap;
        try {
          payloadsMap = await aggregator.makePayloads(weights);
        } finally {
          weights.dispose();
        }
        const payloads: Array<[string, Uint8Array]> = [];
        try {
          for (const [nodeId, payloadWeights] of payloadsMap.entries()) {
            const encoded = await weightsEncode(payloadWeights);
            payloads.push([nodeId, encoded]);
          }
        } finally {
          payloadsMap.forEach((w) => w.dispose());
        }
        post({
          type: "response",
          requestId: msg.requestId,
          round: aggregator.round,
          communicationRound: aggregator.communicationRound,
          payloads,
        });
      } catch (e) {
        post({
          type: "response",
          requestId: msg.requestId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      break;
    }
    case "aggregator-add": {
      try {
        if (aggregator === undefined) {
          throw new Error("aggregator not initialized");
        }
        const weights = weightsDecode(msg.weights);
        try {
          await aggregator.add(
            msg.nodeId,
            weights,
            msg.aggregationRound,
            msg.communicationRound,
          );
        } finally {
          weights.dispose();
        }
        const aggregated = await flushAggregatedResult();
        post({
          type: "response",
          requestId: msg.requestId,
          round: aggregator.round,
          communicationRound: aggregator.communicationRound,
          aggregated,
        });
      } catch (e) {
        post({
          type: "response",
          requestId: msg.requestId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      break;
    }
    case "aggregator-dispose": {
      pendingAggregationWeights?.dispose();
      pendingAggregationWeights = undefined;
      aggregator?.dispose();
      aggregator = undefined;
      break;
    }
  }
}

async function handleModelMessage(msg: ToComputeWorker): Promise<void> {
  await ensureBackend();
  switch (msg.type) {
    case "model-init": {
      try {
        model?.dispose();
        model = await modelDecode(msg.model);
        if (msg.metadata !== undefined) {
          model.metadata = msg.metadata;
        }
        const configurable = model as Model<DataType> & {
          setDebugLabel?: (label: string) => void;
          setGoldfishLoss?: (config: GoldfishLossConfig | undefined) => void;
          setLearningRate?: (lr: number) => void;
        };
        if (msg.debugLabel !== undefined) {
          configurable.setDebugLabel?.(msg.debugLabel);
        }
        if (msg.goldfishLoss !== undefined) {
          configurable.setGoldfishLoss?.(msg.goldfishLoss);
        }
        if (msg.learningRate !== undefined) {
          configurable.setLearningRate?.(msg.learningRate);
        }
        post({
          type: "response",
          requestId: msg.requestId,
        });
      } catch (e) {
        post({
          type: "response",
          requestId: msg.requestId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      break;
    }
    case "model-set-weights": {
      try {
        if (model === undefined) {
          throw new Error("worker model not initialized");
        }
        const weights = weightsDecode(msg.weights);
        try {
          model.weights = weights;
        } finally {
          weights.dispose();
        }
        post({
          type: "response",
          requestId: msg.requestId,
        });
      } catch (e) {
        post({
          type: "response",
          requestId: msg.requestId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      break;
    }
    case "model-evaluate": {
      try {
        if (model === undefined) {
          throw new Error("worker model not initialized");
        }
        const dataset = createRemoteDataset(msg.dataType, msg.iteratorId);
        const metrics = await model.evaluate(dataset);
        post({
          type: "response",
          requestId: msg.requestId,
          metrics,
        });
      } catch (e) {
        post({
          type: "response",
          requestId: msg.requestId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      break;
    }
    case "model-train": {
      const batches: BatchLogs[] = [];
      let epochTime = 0;
      let validation: ValidationMetrics | undefined;
      let done: boolean | undefined;
      try {
        if (model === undefined) {
          throw new Error("worker model not initialized");
        }
        const valDataset =
          msg.valDatasetId !== undefined
            ? createRemoteDataset(msg.dataType, msg.valDatasetId, msg.requestId)
            : undefined;
        let gen: AsyncGenerator<BatchLogs, EpochLogs>;
        if (msg.maxBatchCount !== undefined) {
          const iterModel = model as unknown as IterationTrainableTextModel;
          const iterator: AsyncIterator<
            Batched<DataFormat.ModelEncoded["text"]>
          > = {
            next: () =>
              pullNextBatch("text", msg.trainIteratorId, false, msg.requestId),
          };
          gen = iterModel.trainNextBatches(
            iterator,
            msg.maxBatchCount,
            valDataset as
              | Dataset<Batched<DataFormat.ModelEncoded["text"]>>
              | undefined,
            (d) => {
              done = d;
            },
          );
        } else {
          const trainDataset = createRemoteDataset(
            msg.dataType,
            msg.trainIteratorId,
            msg.requestId,
          );
          gen = model.train(trainDataset, valDataset);
        }

        const startTime = performance.now();
        try {
          for (;;) {
            if (stoppedRequests.has(msg.requestId)) {
              break;
            }
            const next = await gen.next();
            if (next.done) {
              epochTime = next.value.epochTime;
              validation = next.value.validation;
              break;
            }
            batches.push(next.value);
            post({
              type: "train-batch",
              requestId: msg.requestId,
              log: next.value,
            });
          }
        } catch (err) {
          if (!(err instanceof StopTrainingError)) {
            throw err;
          }
          epochTime = performance.now() - startTime;
        }
        stoppedRequests.delete(msg.requestId);

        const currentWeights = model.weights;
        const encodedWeights = await weightsEncode(currentWeights);

        post({
          type: "train-done",
          requestId: msg.requestId,
          batches,
          epochTime,
          validation,
          weights: encodedWeights,
          done,
        });
      } catch (e) {
        stoppedRequests.delete(msg.requestId);
        post({
          type: "train-done",
          requestId: msg.requestId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      break;
    }
    case "model-dispose": {
      model?.dispose();
      model = undefined;
      break;
    }
  }
}

let aggregatorQueue = Promise.resolve();
let modelQueue = Promise.resolve();

self.onmessage = (event: MessageEvent<ToComputeWorker>) => {
  const msg = event.data;
  if (msg.type === "dataset-batch") {
    const pending = pendingDatasetRequests.get(msg.requestId);
    if (pending !== undefined) {
      pendingDatasetRequests.delete(msg.requestId);
      pending.resolve(msg);
    }
    return;
  }
  if (msg.type === "model-stop") {
    stoppedRequests.add(msg.requestId);
    for (const [reqId, pending] of pendingDatasetRequests.entries()) {
      pendingDatasetRequests.delete(reqId);
      pending.reject(new StopTrainingError());
    }
    return;
  }
  if (msg.type === "init-aggregator" || msg.type.startsWith("aggregator-")) {
    aggregatorQueue = aggregatorQueue.then(() => handleAggregatorMessage(msg));
    return;
  }
  modelQueue = modelQueue.then(() => handleModelMessage(msg));
};

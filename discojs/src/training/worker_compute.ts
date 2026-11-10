import * as tf from "@tensorflow/tfjs";
import { Map as ImmutableMap } from "immutable";
import type { Set as ImmutableSet } from "immutable";

import { Aggregator } from "#aggregator/index";
import type { NodeID } from "#client/index";
import type { Batched, Dataset } from "#dataset/index";
import type {
  BatchLogs,
  GoldfishLossConfig,
  ValidationMetrics,
} from "#models/index";
import { EpochLogs, Model } from "#models/index";
import {
  modelEncode,
  serializeTaskToJSON,
  weightsDecode,
  weightsEncode,
} from "#serialization/index";
import type { Task } from "#task/index";
import type {
  FromComputeWorker,
  SerializedBatch,
  SerializedImage,
  ToComputeWorker,
} from "#training/compute_messages";
import type { JSONLike } from "#serialization/index";
import type { DataFormat, DataType, Network } from "#types/index";
import type { WeightsContainer } from "#weights/index";

function serializeBatch<D extends DataType>(
  dataType: D,
  batch: Batched<DataFormat.ModelEncoded[D]>,
): SerializedBatch {
  switch (dataType) {
    case "image":
      return (batch as Batched<DataFormat.ModelEncoded["image"]>)
        .map(([img, label]): [SerializedImage, number] => [
          {
            data: img.data,
            width: img.width,
            height: img.height,
            depth: img.depth,
          },
          label,
        ])
        .toArray();
    case "tabular":
    case "text":
      return (
        batch as
          | Batched<DataFormat.ModelEncoded["tabular"]>
          | Batched<DataFormat.ModelEncoded["text"]>
      )
        .map(([row, label]): [number[], number] => [row.toArray(), label])
        .toArray();
  }
}

type PendingTrainHandler = {
  onBatch: (log: BatchLogs) => void;
  onDone: (msg: Extract<FromComputeWorker, { type: "train-done" }>) => void;
};

type DatasetSource<D extends DataType = DataType> = {
  dataType: D;
  dataset?: Dataset<Batched<DataFormat.ModelEncoded[D]>>;
  iterator?: AsyncIterator<Batched<DataFormat.ModelEncoded[D]>>;
};

export class ComputeWorkerHost {
  readonly #worker: Worker;
  readonly aggregator: WorkerAggregator;
  readonly #initPromise: Promise<void>;
  #nextRequestId = 1;
  #nextIteratorId = 1;
  #terminated = false;

  readonly #pendingResponses = new Map<
    number,
    {
      resolve: (msg: Extract<FromComputeWorker, { type: "response" }>) => void;
      reject: (reason: unknown) => void;
    }
  >();
  readonly #pendingTrains = new Map<number, PendingTrainHandler>();
  readonly #datasetSources = new Map<number, DatasetSource>();

  constructor(task: Task<DataType, Network>, scheme: Network) {
    this.#worker = new Worker(new URL("./compute.worker.js", import.meta.url), {
      type: "module",
    });
    this.#worker.onmessage = (event: MessageEvent<FromComputeWorker>) => {
      void this.#handleWorkerMessage(event.data);
    };
    this.#worker.onerror = (event: ErrorEvent) => {
      const err =
        event.error instanceof Error
          ? event.error
          : new Error(event.message || "compute worker error");
      for (const pending of this.#pendingResponses.values()) {
        pending.reject(err);
      }
      this.#pendingResponses.clear();
      for (const [reqId, train] of this.#pendingTrains.entries()) {
        this.#pendingTrains.delete(reqId);
        train.onDone({
          type: "train-done",
          requestId: reqId,
          error: err.message,
        });
      }
    };

    const communicationRounds =
      task.trainingInformation.aggregationStrategy === "secure" ? 2 : 1;
    this.aggregator = new WorkerAggregator(this, 0, communicationRounds);

    this.#initPromise = this.#request({
      type: "init-aggregator",
      requestId: this.#nextRequestId++,
      task: JSON.parse(JSON.stringify(serializeTaskToJSON(task))) as JSONLike,
      scheme,
    }).then(() => undefined);
  }

  post(msg: ToComputeWorker): void {
    if (this.#terminated) return;
    this.#worker.postMessage(msg);
  }

  async request(
    msg: ToComputeWorker & { requestId: number },
  ): Promise<Extract<FromComputeWorker, { type: "response" }>> {
    await this.#initPromise;
    return this.#request(msg);
  }

  nextRequestId(): number {
    return this.#nextRequestId++;
  }

  async ensureMainThreadCpuBackend(): Promise<void> {
    if (typeof window !== "undefined" && tf.getBackend() !== "cpu") {
      await tf.setBackend("cpu");
      await tf.ready();
    }
  }

  async wrapModel<D extends DataType>(
    localModel: Model<D>,
    options?: {
      debugLabel?: string;
      goldfishLoss?: GoldfishLossConfig;
      learningRate?: number;
    },
  ): Promise<WorkerModel<D>> {
    await this.#initPromise;
    const encodedModel = await modelEncode(localModel);
    await this.#request({
      type: "model-init",
      requestId: this.#nextRequestId++,
      model: encodedModel,
      metadata: localModel.metadata,
      debugLabel: options?.debugLabel,
      goldfishLoss: options?.goldfishLoss,
      learningRate: options?.learningRate,
    });
    return new WorkerModel(this, localModel);
  }

  async setModelWeights(weights: WeightsContainer): Promise<void> {
    await this.#initPromise;
    const encoded = await weightsEncode(weights);
    await this.#request({
      type: "model-set-weights",
      requestId: this.#nextRequestId++,
      weights: encoded,
    });
  }

  async evaluateModel<D extends DataType>(
    dataType: D,
    dataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): Promise<ValidationMetrics> {
    await this.#initPromise;
    const iteratorId = this.#registerDataset(dataType, dataset);
    try {
      const response = await this.#request({
        type: "model-evaluate",
        requestId: this.#nextRequestId++,
        dataType,
        iteratorId,
      });
      if (response.metrics === undefined) {
        throw new Error("missing evaluation metrics from compute worker");
      }
      return response.metrics;
    } finally {
      this.#datasetSources.delete(iteratorId);
    }
  }

  async *trainModel<D extends DataType>(
    dataType: D,
    trainingDataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    validationDataset: Dataset<Batched<DataFormat.ModelEncoded[D]>> | undefined,
    onWeightsUpdated: (weights: WeightsContainer) => void,
  ): AsyncGenerator<BatchLogs, EpochLogs> {
    await this.#initPromise;
    const trainIteratorId = this.#registerDataset(dataType, trainingDataset);
    const valDatasetId =
      validationDataset !== undefined
        ? this.#registerDataset(dataType, validationDataset)
        : undefined;
    try {
      return yield* this.#runTrainStream(
        {
          type: "model-train",
          requestId: this.#nextRequestId++,
          dataType,
          trainIteratorId,
          valDatasetId,
        },
        onWeightsUpdated,
      );
    } finally {
      this.#datasetSources.delete(trainIteratorId);
      if (valDatasetId !== undefined) {
        this.#datasetSources.delete(valDatasetId);
      }
    }
  }

  async *trainModelNextBatches(
    trainingIterator: AsyncIterator<Batched<DataFormat.ModelEncoded["text"]>>,
    maxBatchCount: number,
    validationDataset:
      | Dataset<Batched<DataFormat.ModelEncoded["text"]>>
      | undefined,
    setDone: ((done: boolean) => void) | undefined,
    onWeightsUpdated: (weights: WeightsContainer) => void,
  ): AsyncGenerator<BatchLogs, EpochLogs> {
    await this.#initPromise;
    const trainIteratorId = this.#registerIterator("text", trainingIterator);
    const valDatasetId =
      validationDataset !== undefined
        ? this.#registerDataset("text", validationDataset)
        : undefined;
    try {
      return yield* this.#runTrainStream(
        {
          type: "model-train",
          requestId: this.#nextRequestId++,
          dataType: "text",
          trainIteratorId,
          valDatasetId,
          maxBatchCount,
        },
        onWeightsUpdated,
        setDone,
      );
    } finally {
      this.#datasetSources.delete(trainIteratorId);
      if (valDatasetId !== undefined) {
        this.#datasetSources.delete(valDatasetId);
      }
    }
  }

  disposeModel(): void {
    this.post({ type: "model-dispose" });
  }

  terminate(): void {
    if (this.#terminated) return;
    this.#terminated = true;
    this.#worker.terminate();
    this.#datasetSources.clear();
    const err = new Error("compute worker terminated");
    for (const pending of this.#pendingResponses.values()) {
      pending.reject(err);
    }
    this.#pendingResponses.clear();
    for (const [reqId, train] of this.#pendingTrains.entries()) {
      this.#pendingTrains.delete(reqId);
      train.onDone({
        type: "train-done",
        requestId: reqId,
        batches: [],
        epochTime: 0,
      });
    }
  }

  #registerDataset<D extends DataType>(
    dataType: D,
    dataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): number {
    const id = this.#nextIteratorId++;
    this.#datasetSources.set(id, {
      dataType,
      dataset,
    });
    return id;
  }

  #registerIterator<D extends DataType>(
    dataType: D,
    iterator: AsyncIterator<Batched<DataFormat.ModelEncoded[D]>>,
  ): number {
    const id = this.#nextIteratorId++;
    this.#datasetSources.set(id, {
      dataType,
      iterator: iterator as AsyncIterator<
        Batched<DataFormat.ModelEncoded[DataType]>
      >,
    });
    return id;
  }

  #request(
    msg: ToComputeWorker & { requestId: number },
  ): Promise<Extract<FromComputeWorker, { type: "response" }>> {
    if (this.#terminated) {
      return Promise.reject(new Error("compute worker terminated"));
    }
    return new Promise((resolve, reject) => {
      this.#pendingResponses.set(msg.requestId, { resolve, reject });
      this.#worker.postMessage(msg);
    });
  }

  async *#runTrainStream(
    msg: Extract<ToComputeWorker, { type: "model-train" }>,
    onWeightsUpdated: (weights: WeightsContainer) => void,
    setDone?: (done: boolean) => void,
  ): AsyncGenerator<BatchLogs, EpochLogs> {
    const queue: Array<
      | { kind: "batch"; log: BatchLogs }
      | {
          kind: "done";
          msg: Extract<FromComputeWorker, { type: "train-done" }>;
        }
    > = [];
    let notify: (() => void) | undefined;
    let doneMsg: Extract<FromComputeWorker, { type: "train-done" }> | undefined;

    let resolveDone!: (
      res: Extract<FromComputeWorker, { type: "train-done" }>,
    ) => void;
    const donePromise = new Promise<
      Extract<FromComputeWorker, { type: "train-done" }>
    >((resolve) => {
      resolveDone = resolve;
    });

    this.#pendingTrains.set(msg.requestId, {
      onBatch: (log) => {
        queue.push({ kind: "batch", log });
        notify?.();
        notify = undefined;
      },
      onDone: (done) => {
        doneMsg = done;
        queue.push({ kind: "done", msg: done });
        resolveDone(done);
        notify?.();
        notify = undefined;
      },
    });

    this.post(msg);

    try {
      for (;;) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            notify = resolve;
          });
        }
        const item = queue.shift();
        if (item === undefined) continue;
        if (item.kind === "batch") {
          yield item.log;
        } else {
          break;
        }
      }
    } finally {
      if (doneMsg === undefined && !this.#terminated) {
        this.post({ type: "model-stop", requestId: msg.requestId });
        doneMsg = await donePromise;
      }
      this.#pendingTrains.delete(msg.requestId);
      if (doneMsg?.weights !== undefined) {
        const decoded = weightsDecode(doneMsg.weights);
        try {
          onWeightsUpdated(decoded);
        } finally {
          decoded.dispose();
        }
      }
    }

    if (doneMsg?.error !== undefined) {
      throw new Error(doneMsg.error);
    }
    if (doneMsg?.done !== undefined) {
      setDone?.(doneMsg.done);
    }
    return new EpochLogs(
      doneMsg?.batches ?? [],
      doneMsg?.epochTime ?? 0,
      doneMsg?.validation,
    );
  }

  async #handleWorkerMessage(msg: FromComputeWorker): Promise<void> {
    switch (msg.type) {
      case "response": {
        const pending = this.#pendingResponses.get(msg.requestId);
        if (pending === undefined) return;
        this.#pendingResponses.delete(msg.requestId);
        if (msg.error !== undefined) {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve(msg);
        }
        break;
      }
      case "dataset-next": {
        const source = this.#datasetSources.get(msg.iteratorId);
        if (source === undefined) {
          this.post({
            type: "dataset-batch",
            requestId: msg.requestId,
            done: true,
          });
          return;
        }
        if ((msg.reset ?? false) || source.iterator === undefined) {
          if (source.dataset === undefined) {
            this.post({
              type: "dataset-batch",
              requestId: msg.requestId,
              done: true,
            });
            return;
          }
          source.iterator = source.dataset[Symbol.asyncIterator]();
        }
        const next = await source.iterator.next();
        if (next.done === true) {
          this.post({
            type: "dataset-batch",
            requestId: msg.requestId,
            done: true,
          });
        } else {
          this.post({
            type: "dataset-batch",
            requestId: msg.requestId,
            batch: serializeBatch(source.dataType, next.value),
            done: false,
          });
        }
        break;
      }
      case "train-batch": {
        this.#pendingTrains.get(msg.requestId)?.onBatch(msg.log);
        break;
      }
      case "train-done": {
        this.#pendingTrains.get(msg.requestId)?.onDone(msg);
        break;
      }
    }
  }
}

export class WorkerAggregator extends Aggregator {
  readonly #host: ComputeWorkerHost;

  constructor(
    host: ComputeWorkerHost,
    roundCutoff = 0,
    communicationRounds = 1,
  ) {
    super(roundCutoff, communicationRounds);
    this.#host = host;
  }

  override registerNode(nodeId: NodeID): boolean {
    const added = super.registerNode(nodeId);
    if (added) {
      this.#host.post({ type: "aggregator-register-node", nodeId });
    }
    return added;
  }

  override setNodes(nodeIds: ImmutableSet<NodeID>): void {
    super.setNodes(nodeIds);
    this.#host.post({
      type: "aggregator-set-nodes",
      nodes: nodeIds.toArray(),
    });
  }

  override setRound(round: number): void {
    super.setRound(round);
    this.#host.post({
      type: "aggregator-set-round",
      round: this.round,
    });
  }

  override removeNode(nodeId: NodeID): void {
    super.removeNode(nodeId);
    this.#host.post({
      type: "aggregator-remove-node",
      nodeId,
    });
  }

  override async add(
    nodeId: NodeID,
    contribution: WeightsContainer,
    aggregationRound: number,
    communicationRound?: number,
  ): Promise<void> {
    if (!this.isValidContribution(nodeId, aggregationRound)) {
      throw new Error(
        "Tried adding an invalid contribution. Handle this case before calling add.",
      );
    }
    const encoded = await weightsEncode(contribution);
    const response = await this.#host.request({
      type: "aggregator-add",
      requestId: this.#host.nextRequestId(),
      nodeId,
      weights: encoded,
      aggregationRound,
      communicationRound,
    });
    this.#syncStateAndEmit(response);
  }

  override async makePayloads(
    base: WeightsContainer,
  ): Promise<ImmutableMap<NodeID, WeightsContainer>> {
    const encoded = await weightsEncode(base);
    const response = await this.#host.request({
      type: "aggregator-make-payloads",
      requestId: this.#host.nextRequestId(),
      weights: encoded,
    });
    const entries: Array<[NodeID, WeightsContainer]> = (
      response.payloads ?? []
    ).map(([nodeId, bytes]) => [nodeId, weightsDecode(bytes)]);
    return ImmutableMap(entries);
  }

  override dispose(): void {
    super.dispose();
    this.#host.post({ type: "aggregator-dispose" });
  }

  protected override _add(): void {
    throw new Error("WorkerAggregator delegates _add to worker");
  }

  protected override aggregate(): WeightsContainer {
    throw new Error("WorkerAggregator delegates aggregate to worker");
  }

  override isFull(): boolean {
    return false;
  }

  #syncStateAndEmit(
    response: Extract<FromComputeWorker, { type: "response" }>,
  ): void {
    if (response.round !== undefined) {
      this._round = response.round;
    }
    if (response.communicationRound !== undefined) {
      this._communicationRound = response.communicationRound;
    }
    if (response.aggregated !== undefined) {
      this._round = response.aggregated.round;
      this._communicationRound = response.aggregated.communicationRound;
      const weights = weightsDecode(response.aggregated.weights);
      this.emit("aggregation", weights);
    }
  }
}

export class WorkerModel<D extends DataType> extends Model<D> {
  readonly #host: ComputeWorkerHost;
  readonly #localModel: Model<D>;
  #weightsDirty = false;
  #released = false;

  constructor(host: ComputeWorkerHost, localModel: Model<D>) {
    super();
    this.#host = host;
    this.#localModel = localModel;
    this.metadata = localModel.metadata;
  }

  override get datatype(): D {
    return this.#localModel.datatype;
  }

  override get weights(): WeightsContainer {
    return this.#localModel.weights;
  }

  override set weights(ws: WeightsContainer) {
    this.#localModel.weights = ws;
    this.#weightsDirty = true;
  }

  override async *train(
    trainingDataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): AsyncGenerator<BatchLogs, EpochLogs> {
    await this.#syncWeightsIfDirty();
    return yield* this.#host.trainModel(
      this.datatype,
      trainingDataset,
      validationDataset,
      (ws) => {
        this.#localModel.weights = ws;
        this.#weightsDirty = false;
      },
    );
  }

  async *trainNextBatches(
    trainingIterator: AsyncIterator<Batched<DataFormat.ModelEncoded["text"]>>,
    maxBatchCount: number,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded["text"]>>,
    setDone?: (done: boolean) => void,
  ): AsyncGenerator<BatchLogs, EpochLogs> {
    await this.#syncWeightsIfDirty();
    return yield* this.#host.trainModelNextBatches(
      trainingIterator,
      maxBatchCount,
      validationDataset,
      setDone,
      (ws) => {
        this.#localModel.weights = ws;
        this.#weightsDirty = false;
      },
    );
  }

  override async evaluate(
    validationDataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): Promise<ValidationMetrics> {
    await this.#syncWeightsIfDirty();
    return await this.#host.evaluateModel(this.datatype, validationDataset);
  }

  override async predict(
    batch: Batched<DataFormat.ModelEncoded[D][0]>,
    options?: unknown,
  ): Promise<Batched<DataFormat.ModelEncoded[D][1]>> {
    const predictor = this.#localModel as Model<D> & {
      predict(
        b: Batched<DataFormat.ModelEncoded[D][0]>,
        o?: unknown,
      ): Promise<Batched<DataFormat.ModelEncoded[D][1]>>;
    };
    return await predictor.predict(batch, options);
  }

  releaseLocalModel(): Model<D> {
    this.#released = true;
    this.#localModel.metadata = this.metadata;
    this.#host.disposeModel();
    return this.#localModel;
  }

  override dispose(): void {
    if (!this.#released) {
      this.#localModel.dispose();
      this.#host.disposeModel();
    }
  }

  async #syncWeightsIfDirty(): Promise<void> {
    if (!this.#weightsDirty) return;
    this.#weightsDirty = false;
    const ws = this.#localModel.weights;
    await this.#host.setModelWeights(ws);
  }
}

import type { NodeID } from "#client/index";
import type {
  BatchLogs,
  GoldfishLossConfig,
  ModelMetadata,
  ValidationMetrics,
} from "#models/index";
import type { JSONLike } from "#serialization/index";
import type { DataType, Network } from "#types/index";

export type SerializedImage = {
  data: Float32Array;
  width: number;
  height: number;
  depth: 3;
};

export type SerializedBatch =
  | Array<[SerializedImage, number]>
  | Array<[number[], number]>;

export type ToComputeWorker =
  | {
      type: "init-aggregator";
      requestId: number;
      task: JSONLike;
      scheme: Network;
    }
  | {
      type: "aggregator-set-nodes";
      nodes: NodeID[];
    }
  | {
      type: "aggregator-register-node";
      nodeId: NodeID;
    }
  | {
      type: "aggregator-remove-node";
      nodeId: NodeID;
    }
  | {
      type: "aggregator-set-round";
      round: number;
    }
  | {
      type: "aggregator-make-payloads";
      requestId: number;
      weights: Uint8Array;
    }
  | {
      type: "aggregator-add";
      requestId: number;
      nodeId: NodeID;
      weights: Uint8Array;
      aggregationRound: number;
      communicationRound?: number;
    }
  | {
      type: "aggregator-dispose";
    }
  | {
      type: "model-init";
      requestId: number;
      model: Uint8Array;
      metadata?: ModelMetadata;
      debugLabel?: string;
      goldfishLoss?: GoldfishLossConfig;
      learningRate?: number;
    }
  | {
      type: "model-set-weights";
      requestId: number;
      weights: Uint8Array;
    }
  | {
      type: "model-evaluate";
      requestId: number;
      dataType: DataType;
      iteratorId: number;
    }
  | {
      type: "model-train";
      requestId: number;
      dataType: DataType;
      trainIteratorId: number;
      valDatasetId?: number;
      maxBatchCount?: number;
    }
  | {
      type: "model-stop";
      requestId: number;
    }
  | {
      type: "model-dispose";
    }
  | {
      type: "dataset-batch";
      requestId: number;
      batch?: SerializedBatch;
      done: boolean;
    };

export type AggregatedResult = {
  weights: Uint8Array;
  round: number;
  communicationRound: number;
};

export type FromComputeWorker =
  | {
      type: "response";
      requestId: number;
      error?: string;
      round?: number;
      communicationRound?: number;
      aggregated?: AggregatedResult;
      payloads?: Array<[NodeID, Uint8Array]>;
      metrics?: ValidationMetrics;
    }
  | {
      type: "dataset-next";
      requestId: number;
      iteratorId: number;
      reset?: boolean;
    }
  | {
      type: "train-batch";
      requestId: number;
      log: BatchLogs;
    }
  | {
      type: "train-done";
      requestId: number;
      error?: string;
      batches?: BatchLogs[];
      epochTime?: number;
      validation?: ValidationMetrics;
      weights?: Uint8Array;
      done?: boolean;
    };

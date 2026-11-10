import type {
  BatchLogs,
  DataFormat,
  DataType,
  RoundStatus,
  deserializeTaskFromJSON,
  ValidationMetrics,
} from "@epfml/discojs";

export type RawSample = DataFormat.Raw[DataType];

export type ToWorker =
  | {
      type: "start";
      task: Parameters<typeof deserializeTaskFromJSON>[0];
      serverUrl: string;
      scheme: "local" | "federated" | "decentralized";
    }
  | { type: "data"; requestId: number; samples: RawSample[]; done: boolean }
  | {
      type: "network-response";
      requestId: number;
      model?: Uint8Array;
      weights?: Uint8Array;
      syncedWeights?: Uint8Array;
      error?: string;
      errorName?: string;
    }
  | { type: "network-event"; event: "status"; status: RoundStatus }
  | { type: "network-event"; event: "participants"; count: number }
  | { type: "stop" };

export type FromWorker =
  | { type: "data-request"; requestId: number; streamId: number }
  | {
      type: "network-request";
      requestId: number;
      operation: "connect" | "begin" | "end" | "disconnect";
      weights?: Uint8Array;
    }
  | { type: "status"; status: RoundStatus }
  | { type: "participants"; count: number }
  | { type: "batch"; log: BatchLogs }
  | {
      type: "epoch";
      batches: BatchLogs[];
      epochTime: number;
      validation?: ValidationMetrics;
    }
  | {
      type: "round";
      participants: number;
      preRoundValidation?: ValidationMetrics;
      postAggregationValidation?: ValidationMetrics;
    }
  | { type: "finished"; stopped: boolean; model?: Uint8Array }
  | { type: "error"; message: string; errorName?: string };

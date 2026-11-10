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
      peerPort?: MessagePort;
      scheme: "local" | "federated" | "decentralized";
    }
  | { type: "data"; requestId: number; samples: RawSample[]; done: boolean }
  | { type: "stop" };

export type FromWorker =
  | { type: "data-request"; requestId: number; streamId: number }
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

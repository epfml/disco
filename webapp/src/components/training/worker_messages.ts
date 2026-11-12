import type {
  BatchLogs,
  RoundStatus,
  deserializeTaskFromJSON,
  ValidationMetrics,
} from "@epfml/discojs";

import type { DatasetSource } from "../dataset_input/source";

export type ToWorker =
  | {
      type: "start";
      task: Parameters<typeof deserializeTaskFromJSON>[0];
      serverUrl: string;
      peerPort?: MessagePort;
      dataset: DatasetSource;
      scheme: "local" | "federated" | "decentralized";
    }
  | { type: "stop" };

export type FromWorker =
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

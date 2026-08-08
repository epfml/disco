export {
  modelEncode,
  modelDecode,
  weightsEncode,
  weightsDecode,
  serializeTaskToJSON,
  deserializeTaskFromJSON,
  isEncoded,
} from "./serialization/index.js";
export type { Encoded } from "./serialization/index.js";

export {
  MeanAggregator,
  SecureAggregator,
  getAggregator,
} from "./aggregator/index.js";

export {
  LocalClient,
  getClient,
  DecentralizedClient,
  FederatedClient,
  mtype,
  federatedMessages,
  decentralizedMessages,
} from "./client/index.js";
export type { Client, NodeID } from "./client/index.js";

export { WeightsContainer, avg } from "./weights/index.js";

export { Disco } from "./training/index.js";
export type { RoundLogs, RoundStatus, SummaryLogs } from "./training/index.js";

export { Validator } from "./validator.js";

export type {
  ModelCard,
  ModelCardInfo,
  BatchLogs,
  HellaSwagDataset,
} from "./models/index.js";

export {
  Model,
  EpochLogs,
  Tokenizer,
  fetchModels,
  GPT,
  TFJS,
  ONNXModel,
  HELLASWAG_URL,
  evaluate_hellaswag,
} from "./models/index.js";
export type { GPTConfig, HellaSwagExample } from "./models/index.js";

export { EventEmitter } from "./utils/event_emitter.js";

export { Dataset, Image } from "./dataset/index.js";
export type { Text, Tabular } from "./dataset/index.js";

export { split, gather } from "./utils/async_iterator.js";

export {
  Task,
  TrainingInformation,
  pushTask,
  fetchTasks,
} from "./task/index.js";
export type { TaskProvider } from "./task/index.js";

export type { DataType, Network, DataFormat } from "./types/index.js";

export { extractColumn } from "./processing/index.js";

// eslint-disable-next-line no-restricted-syntax -- namespace re-export acceptable here
export * as defaultTasks from "./default_tasks/index.js";
export { cards as defaultModels } from "./models/index.js";

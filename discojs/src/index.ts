export { LocalClient, getClient } from "./client/index.js";

export {
  modelEncode,
  modelDecode,
  weightsEncode,
  weightsDecode,
  serializeTaskToJSON,
  deserializeTaskFromJSON,
  isEncoded,
  Encoded,
} from "./serialization/index.js";

export { MeanAggregator, getAggregator } from "./aggregator/index.js";

export {
  NodeID,
  mtype,
  federatedMessages,
  decentralizedMessages,
} from "./client/index.js";

export { WeightsContainer, avg } from "./weights/index.js";

export {
  Disco,
  RoundLogs,
  RoundStatus,
  SummaryLogs,
} from "./training/index.js";

export { Validator } from "./validator.js";

export type {
  ModelCard,
  ModelCardInfo,
  BatchLogs,
  ValidationMetrics,
  HellaSwagDataset,
} from "./models/index.js";

export {
  Model,
  EpochLogs,
  Tokenizer,
  fetchModels,
  GPT,
  GPTConfig,
  TFJS,
  ONNXModel,
  HELLASWAG_URL,
  HellaSwagExample,
  evaluate_hellaswag,
} from "./models/index.js";

export { EventEmitter } from "./utils/event_emitter.js";

export { Dataset, Image, Text, Tabular } from "./dataset/index.js";

export { split, gather } from "./utils/async_iterator.js";

export {
  Task,
  TaskProvider,
  TrainingInformation,
  pushTask,
  fetchTasks,
} from "./task/index.js";

export type { DataType, Network, DataFormat } from "./types/index.js";

export { extractColumn } from "./processing/index.js";

export * as defaultTasks from "./default_tasks/index.js";
export { cards as defaultModels } from "./models/index.js";

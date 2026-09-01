import type { List } from "immutable";
import type { DataFormat } from "#types/index";
import type { Batched, Dataset } from "#dataset/index";
import type { Model } from "#models/index";
import type { BatchLogs, EpochLogs } from "#models/index";

export type WeightNormHistory = List<List<number>>;

export type IterationTrainableTextModel = Model<"text"> & {
  trainNextBatches(
    trainingIterator: AsyncIterator<Batched<DataFormat.ModelEncoded["text"]>>,
    maxBatchCount: number,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded["text"]>>,
    setDone?: (done: boolean) => void,
  ): AsyncGenerator<BatchLogs, EpochLogs>;
};

export type SummaryLogs = {
  round: number;
  epoch: number;
  trainingLoss: number;
  trainingAccuracy: number;
  peakMemory: number;
  epochTime: number;
  roundValidationLoss?: number;
  roundValidationAccuracy?: number;
  validationLoss?: number;
  validationAccuracy?: number;
  postAggregationValidationLoss?: number;
  postAggregationValidationAccuracy?: number;
};

export type RoundStatus =
  | "not enough participants" // Server notification to wait for more participants
  | "waiting for peers to share weights" // for decentralized only, the other peers are still training their round
  | "updating model" // fetching/aggregating local updates into a global model
  | "local training" // Training the model locally
  | "connecting to peers"; // for decentralized only, establishing the peer-to-peer connections

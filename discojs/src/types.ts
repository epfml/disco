import { List } from "immutable";

import type { Dataset, Image, processing, Tabular, Text } from "./index.js";

export type DataType = "image" | "tabular" | "text";

type Token = number;
export interface DataTypeToPreprocessed {
  image: processing.NormalizedImage<3>;
  tabular: List<number>;
  text: List<Token>;
}
export interface DataTypeToPreprocessedLabeled {
  image: [DataTypeToPreprocessed["image"], label: number];
  tabular: [features: DataTypeToPreprocessed["tabular"], labels: List<number>];
  text: [DataTypeToPreprocessed["text"], nexts: List<Token>];
}

export type Batched<T> = List<T>;

export type DataTypeToBatchedPreprocessedLabeledDataset = {
  [D in DataType]: Dataset<Batched<DataTypeToPreprocessedLabeled[D]>>;
};

export type TypedDataset =
  | ["image", Dataset<Image>]
  | ["tabular", Dataset<Tabular>]
  | ["text", Dataset<Text>];

export type TypedLabeledDataset =
  | ["image", Dataset<[Image, label: string]>]
  | ["tabular", Dataset<Tabular>]
  | ["text", Dataset<Text>];

export type TypedPreprocessedLabeledDataset =
  | ["image", Dataset<DataTypeToPreprocessedLabeled["image"]>]
  | ["tabular", Dataset<DataTypeToPreprocessedLabeled["tabular"]>]
  | ["text", Dataset<DataTypeToPreprocessedLabeled["text"]>];

export type TypedBatchedPreprocessedLabeledDataset =
  | ["image", Dataset<Batched<DataTypeToPreprocessedLabeled["image"]>>]
  | ["tabular", Dataset<Batched<DataTypeToPreprocessedLabeled["tabular"]>>]
  | ["text", Dataset<Batched<DataTypeToPreprocessedLabeled["text"]>>];

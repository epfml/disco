import { Dataset, Image, Tabular, Text } from "./dataset/index.js"

export type TypedDataset =
  | ["image", Dataset<Image>]
  | ["tabular", Dataset<Tabular>]
  | ["text", Dataset<Text>];

export type TypedLabeledDataset =
  | ["image", Dataset<[Image, label: string]>]
  | ["tabular", Dataset<Tabular>]
  | ["text", Dataset<Text>];

import { List } from "immutable";

import type {
  Batched,
  Dataset,
  Image,
  processing,
  Tabular,
  Text,
} from "./index.js";

/**
 * The data that we handle goes through various stages.
 * The labels also gets transformed at each stage.
 *
 * raw -> model encoded -> inferred
 */

export type DataType = "image" | "tabular" | "text";

/** what get's ingested by Disco */
export interface Raw {
  image: [Image, label: string];
  tabular: Tabular;
  text: Text;
}
/** what get's ingested by the Validator */
export interface RawWithoutLabel {
  image: Image;
  tabular: Tabular;
  text: Text;
}

type Token = number;
export interface ModelEncoded {
  image: [processing.NormalizedImage<3>, number];
  tabular: [List<number>, List<number>];
  text: [List<Token>, Token];
}
export type ModelEncodedWithoutLabel = { [D in DataType]: ModelEncoded[D][0] };
export type ModelEncodedOnlyWithLabel = { [D in DataType]: ModelEncoded[D][1] };

export interface Inferred {
  image: string;
  tabular: Partial<Record<string, number>>;
  text: string;
}

// allow to handle multiple type
// TODO will be removed when fully generic

export type TypedRawDataset =
  | ["image", Dataset<Raw["image"]>]
  | ["tabular", Dataset<Raw["tabular"]>]
  | ["text", Dataset<Raw["text"]>];
export type TypedRawWithoutLabelDataset =
  | ["image", Dataset<RawWithoutLabel["image"]>]
  | ["tabular", Dataset<RawWithoutLabel["tabular"]>]
  | ["text", Dataset<RawWithoutLabel["text"]>];

export type TypedModelEncodedDataset =
  | ["image", Dataset<ModelEncoded["image"]>]
  | ["tabular", Dataset<ModelEncoded["tabular"]>]
  | ["text", Dataset<ModelEncoded["text"]>];
export type TypedBatchedModelEncodedDataset =
  | ["image", Dataset<Batched<ModelEncoded["image"]>>]
  | ["tabular", Dataset<Batched<ModelEncoded["tabular"]>>]
  | ["text", Dataset<Batched<ModelEncoded["text"]>>];
export type TypedModelEncodedWithoutLabelDataset =
  | ["image", Dataset<ModelEncodedWithoutLabel["image"]>]
  | ["tabular", Dataset<ModelEncodedWithoutLabel["tabular"]>]
  | ["text", Dataset<ModelEncodedWithoutLabel["text"]>];
export type TypedModelEncodedOnlyWithLabelDataset =
  | ["image", Dataset<ModelEncodedOnlyWithLabel["image"]>]
  | ["tabular", Dataset<ModelEncodedOnlyWithLabel["tabular"]>]
  | ["text", Dataset<ModelEncodedOnlyWithLabel["text"]>];

export type TypedInferredDataset =
  | ["image", Dataset<Inferred["image"]>]
  | ["tabular", Dataset<Inferred["tabular"]>]
  | ["text", Dataset<Inferred["text"]>];

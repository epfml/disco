import { Dataset } from "./dataset.js";

// TODO use full type to check shape of array
export type Image = { width: number; height: number; data: Uint8Array };
export type Tabular = Partial<Record<string, string>>;
export type Text = string;

// TODO get rid of it when fully typed
export type TypedDataset =
  | ["image", Dataset<[Image, label: string]>]
  | ["tabular", Dataset<Tabular>]
  | ["text", Dataset<Text>];

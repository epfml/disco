import { List } from "immutable";

export { Image } from "./image.js";

export type Batched<T> = List<T>;

export type Tabular = Partial<Record<string, string>>;
export type Text = string;
export type TokenizedText = List<number>;

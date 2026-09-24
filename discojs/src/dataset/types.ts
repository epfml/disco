import type { List } from "immutable";

export { Image } from "#dataset/image";

export type Batched<T> = List<T>;

export type Tabular = Partial<Record<string, string>>;
export type Text = string;
export type TokenizedText = List<number>;

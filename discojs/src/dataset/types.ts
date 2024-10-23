import { List } from "immutable";

import { Image } from "./image.js"

export type Batched<T> = List<T>;

export { Image };
export type Tabular = Partial<Record<string, string>>;
export type Text = string;

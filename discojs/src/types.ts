import { List } from "immutable";

import type { Image, processing, Tabular, Text } from "./index.js";

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
  tabular: [List<number>, number];
  text: [List<Token>, Token];
}

export interface Inferred {
  image: string;
  tabular: Partial<Record<string, number>>;
  text: string;
}

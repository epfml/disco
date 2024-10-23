import { List } from "immutable";

import type { Image, processing, Tabular, Text } from "../index.js";

/**
 * The data & label format goes through various stages.
 * Raw* is preprocessed into ModelEncoded.
 * ModelEncoded's labels are postprocess into Inferred.
 *
 * Raw* -> ModelEncoded -> Inferred
 */

/** what gets ingested by Disco */
export interface Raw {
  image: [Image, label: string];
  tabular: Tabular;
  text: Text;
}
/** what gets ingested by the Validator */
export interface RawWithoutLabel {
  image: Image;
  tabular: Tabular;
  text: Text;
}

type Token = number;
/**
 * what model can understand
 *
 * training needs data & label input
 * prediction needs data input and outputs label
 **/
export interface ModelEncoded {
  image: [image: processing.NormalizedImage<3>, label: number];
  tabular: [row: List<number>, number];
  text: [line: List<Token>, next: Token];
}

/** what gets outputted by the Validator, for humans */
export interface Inferred {
  // label of the image
  image: string;
  tabular: number;
  // next token
  text: string;
}

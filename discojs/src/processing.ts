import { PreTrainedTokenizer } from "@xenova/transformers";
import { List, Repeat, Seq } from "immutable";
import { Image } from "./dataset/image.js";

export function convertToNumber(raw: string): number {
  const num = Number.parseFloat(raw);
  if (Number.isNaN(num)) throw new Error(`unable to parse "${raw}" as number`);
  return num;
}

export function extractColumn(
  row: Partial<Record<string, string>>,
  column: string,
): string {
  const raw = row[column];
  if (raw === undefined) throw new Error(`${column} not found in row`);
  return raw;
}

export function indexInList(element: string, elements: List<string>): number {
  const ret = elements.indexOf(element);
  if (ret === -1) throw new Error(`${element} not found in list`);
  return ret;
}

function isArrayOfNumber(raw: unknown): raw is number[] {
  return Array.isArray(raw) && raw.every((e) => typeof e === "number");
}

/** Tokenize and truncates input strings
 *
 * @param length number of tokens
 * @returns encoded string in an array of token, size of max_length
 **/
export function tokenizeAndLeftPad(
  line: string,
  tokenizer: PreTrainedTokenizer,
  length: number,
): number[] {
  if (!Number.isInteger(length)) throw new Error("length should be an integer");

  // Transformers.js currently only supports right padding while we need left for text generation
  // Right padding should be supported in the future, once it is, we can directly pad while tokenizing
  // https://github.com/xenova/transformers.js/blob/8804c36591d11d8456788d1bb4b16489121b3be2/src/tokenizers.js#L2517
  const tokenized: unknown = tokenizer(line, {
    padding: false,
    truncation: true,
    return_tensor: false,
    max_length: length,
  });

  if (
    typeof tokenized !== "object" ||
    tokenized === null ||
    !("input_ids" in tokenized) ||
    !isArrayOfNumber(tokenized.input_ids)
  )
    throw new Error("tokenizer returns unexcepted type");
  const tokens: number[] = tokenized.input_ids;

  const paddingSize = length - tokens.length;
  if (paddingSize < 0)
    throw new Error("tokenized returned more token than excepted");

  const padding = new Array<number>(paddingSize);
  padding.fill(tokenizer.pad_token_id);
  const padded = padding.concat(tokens);

  return padded;
}

export function removeAlpha<W extends number, H extends number>(
  image: Image<4, W, H>,
): Image<3, W, H>;
export function removeAlpha<
  D extends 1 | 3,
  W extends number,
  H extends number,
>(image: Image<D | 4, W, H>): Image<D, W, H>;
export function removeAlpha<W extends number, H extends number>(
  image: Image<1 | 3 | 4, W, H>,
): Image<1 | 3, W, H> {
  switch (image.depth) {
    case 1:
    case 3:
      return new Image(image.data, image.width, image.height, image.depth);
    case 4:
      return new Image(
        image.data.filter((_, i) => i % 4 !== 3),
        image.width,
        image.height,
        3,
      );
  }
}

export function expandToMulticolor<W extends number, H extends number>(
  image: Image<1, W, H>,
): Image<3, W, H>;
export function expandToMulticolor<
  D extends 3 | 4,
  W extends number,
  H extends number,
>(image: Image<1 | D, W, H>): Image<D, W, H>;
export function expandToMulticolor<W extends number, H extends number>(
  image: Image<1 | 3 | 4, W, H>,
): Image<3 | 4, W, H> {
  switch (image.depth) {
    case 1:
      return new Image(
        Uint8Array.from(Seq(image.data).flatMap((v) => Repeat(v, 3))),
        image.width,
        image.height,
        3,
      );
    case 3:
      return new Image(image.data, image.width, image.height, image.depth);
    case 4:
      return new Image(
        image.data.filter((_, i) => i % 4 !== 3),
        image.width,
        image.height,
        image.depth,
      );
  }
}

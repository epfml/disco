import { PreTrainedTokenizer } from "@xenova/transformers";
import { List } from "immutable";

export function convert_to_number(raw: string): number {
  const num = Number.parseFloat(raw);
  if (Number.isNaN(num)) throw new Error(`unable to parse "${raw}" as number`);
  return num;
}

export function extract_column(
  row: Partial<Record<string, string>>,
  column: string,
): string {
  const raw = row[column];
  if (raw === undefined) throw new Error(`${column} not found in row`);
  return raw;
}

export function index_in_list(element: string, elements: List<string>): number {
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
export function tokenize_and_left_pad(
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

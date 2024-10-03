import { List, Repeat } from "immutable";
import { PreTrainedTokenizer } from "@xenova/transformers";

function isArrayOfNumber(raw: unknown): raw is number[] {
  return Array.isArray(raw) && raw.every((e) => typeof e === "number");
}

type Token = number;

/**
 * Tokenize and truncates input strings
 *
 * @param length number of tokens
 * @returns encoded string in an array of token, size of max_length
 */
export function tokenizeAndLeftPad(
  line: string,
  tokenizer: PreTrainedTokenizer,
  length: number,
): List<Token> {
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
    throw new Error("tokenizer returns unexpected type");
  const tokens: Token[] = tokenized.input_ids;

  const paddingSize = length - tokens.length;
  if (paddingSize < 0)
    throw new Error("tokenized returned more token than expected");

  return Repeat(tokenizer.pad_token_id, paddingSize).concat(tokens).toList();
}

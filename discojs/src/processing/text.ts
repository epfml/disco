import { List } from "immutable";
import { PreTrainedTokenizer } from "@xenova/transformers";
import type { Text, TokenizedText } from '../index.js'

function isArrayOfNumber(raw: unknown): raw is number[] {
  return Array.isArray(raw) && raw.every((e) => typeof e === "number");
}

interface TokenizingConfig {
  padding?: boolean, // default to false, if true pads to max_length
  padding_side?: 'left' | 'right', // default to left
  truncation?: boolean,
  max_length?: number, // the max sequence length used if padding or truncation is enabled
}

/**
 * Tokenize one line of text. 
 * Wrapper around Transformers.js tokenizer to handle type checking and format the output.
 * Note that Transformers.js's tokenizer can tokenize multiple lines of text at once
 * but we are currently not making use of it. Can be useful when padding a batch
 * 
 * @param tokenizer the tokenizer object
 * @param text the text to tokenize
 * @param config TokenizingConfig, the tokenizing parameters when using `tokenizer` 
 * @returns List<number> the tokenized text
 */
export function tokenize(tokenizer: PreTrainedTokenizer, text: Text, config?: TokenizingConfig): TokenizedText {
  config = { ...config }; // create a config if undefined
  
  if (config.padding || config.truncation) {
    if (config.max_length === undefined) throw new Error("max_length needs to be specified to use padding or truncation");
    if (!Number.isInteger(config.max_length))  throw new Error("max_length should be an integer");
  }
  
  if (config.padding) {
    // The padding side is set as an attribute, not in the config
    tokenizer.padding_side = config.padding_side ?? 'left'
    config.truncation = true // for a single sequence, padding implies truncation to max_length
  }

  const tokenizerResult: unknown = tokenizer(text, {...config, return_tensor: false});

  if (
    typeof tokenizerResult !== "object" ||
    tokenizerResult === null ||
    !("input_ids" in tokenizerResult) ||
    !isArrayOfNumber(tokenizerResult.input_ids)
  )
    throw new Error("tokenizer returned unexpected type");
    
  return List(tokenizerResult.input_ids)
}

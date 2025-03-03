import { List } from "immutable";
import { PreTrainedTokenizer } from "@xenova/transformers";

/**
 * Tokenize text using a given tokenizer.
 * This function wraps the underlying tokenizer (from Transformers.js) and returns an immutable list of token IDs.
 * 
 * @param tokenizer - An instance of a PreTrainedTokenizer
 * @param text - The text to tokenize
 * @param config - Optional configuration passed to the tokenizer
 * @returns An Immutable List of token IDs
 */
export function tokenize(tokenizer: PreTrainedTokenizer, text: string, config?: any): List<number> {
  const tokenizerResult: any = tokenizer(text, { ...config, return_tensor: false });
  if (!tokenizerResult || !Array.isArray(tokenizerResult.input_ids)) {
    throw new Error("Tokenizer returned unexpected output");
  }
  return List(tokenizerResult.input_ids);
}

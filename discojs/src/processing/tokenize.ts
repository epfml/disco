import { List } from "immutable";
import { PreTrainedTokenizer } from "@xenova/transformers";


interface TokenizerOutput {
  input_ids: number[];
  // Add additional properties if needed.
}

/**
 * Tokenize text using a given tokenizer.
 * This function wraps the underlying tokenizer (from Transformers.js) and returns an immutable list of token IDs.
 * 
 * @param tokenizer - An instance of a PreTrainedTokenizer
 * @param text - The text to tokenize
 * @param config - Optional configuration passed to the tokenizer
 * @returns An Immutable List of token IDs
 */
export function tokenize(
  tokenizer: PreTrainedTokenizer,
  text: string,
  config: Record<string, unknown> = {}
): List<number> {
  const tokenizerResult = tokenizer(text, { ...config, return_tensor: false }) as TokenizerOutput;

  if (!tokenizerResult || !Array.isArray(tokenizerResult.input_ids)) {
    throw new Error("Tokenizer returned unexpected output");
  }
  
  return List(tokenizerResult.input_ids);
}

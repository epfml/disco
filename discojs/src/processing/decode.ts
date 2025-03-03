import { PreTrainedTokenizer } from "@xenova/transformers";

/**
 * Encodes the text into token IDs and then decodes them back to text
 * Special tokens are skipped during decoding
 *
 * @param tokenizer - An instance of a PreTrainedTokenizer
 * @param text - The text to process
 * @returns The decoded text obtained after encoding and then decoding
 */
export function encodeDecode(tokenizer: PreTrainedTokenizer, text: string): string {
  // Encode the text using the tokenizer.
  const encoding = tokenizer(text, { return_tensor: false });
  // Decode the token IDs back into text while skipping special tokens.
  return tokenizer.decode(encoding.input_ids, { skip_special_tokens: true });
}

import createDebug from "debug";
import { Dataset, Text, models } from "@epfml/discojs";
import { PreTrainedTokenizer } from '@xenova/transformers';

const debug = createDebug("discojs-web:loaders:text");

/**
 * Stream and tokenize text to yield tokenized sequences
 * one at a time. Each sequence has size `blockSize` + 1, where the first `blockSize`
 * tokens are the input and the last token is the label. The following sequence
 * starts with the last token of the previous sequence (so the previous label is now the 
 * first input token).
 * In other words, the stream yields sequences of size `blockSize` + 1 but with an overlap
 * of 1 token between each sequence.
 *
 * @param file the file to read
 * @param tokenizer the tokenizer to use, should match the model that will be trained
 * @param blockSize the context length, the maximum number of tokens of input sequences
 */
class TokenizerStream extends TransformStream<string, number[]> {
  constructor(tokenizer: PreTrainedTokenizer, blockSize: number) {
    let endOfPreviousChunk = ""
    let chunkNumber = 0
    super({
      transform: (chunk, controller) => {
        debug("yield TokenizerStream chunk of length: %o", chunk.length);
        // tokenize the whole chunk at once
        const tokens = models.tokenize(tokenizer, endOfPreviousChunk + chunk, {
          padding: false,
          truncation: false,
          return_tensor: false,
        });
        if (tokens.length < blockSize + 1) {
          // throw if it happens on the 1st chunk
          if (chunkNumber === 0)
            throw new Error(`the chunk (${tokens.length} tokens) is too small ` +
              `to get a sequence of length blockSize (${blockSize + 1} tokens). ` +
              `Either the text file or the chunk size is too small.`);
          // if this isn't the first iteration we simply skip
          // as we expect the last chunk to be potentially smaller than the block size
          debug("chunk smaller than block size, loading next chunk")
          return
        }
        let currentPosition = 0;
        // yield one block of tokens at a time
        // add 1 to include the next token for the prediction label
        while (currentPosition + blockSize + 1 <= tokens.length) {
          controller.enqueue(tokens.slice(currentPosition, currentPosition + blockSize + 1))
          currentPosition += blockSize; // no +1 here
        }
        // keep the last tokens for the next chunk
        // if this was the last chunk the remaining tokens are discarded
        if (currentPosition < tokens.length) {
          endOfPreviousChunk = tokenizer.decode(
            tokens.slice(currentPosition),
            { skip_special_tokens: true }
          )
        }
        else endOfPreviousChunk = "";
        chunkNumber++;
      },
      // No flush, discard the last tokens
    });
  }
}

export function load(file: Blob, tokenizer: PreTrainedTokenizer,
  blockSize: number): Dataset<Text> {
  return new Dataset(async function* () {
    const reader = file
      .stream()
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TokenizerStream(tokenizer, blockSize))
      .getReader();

    while (true) {
      const { value: chunk, done } = await reader.read();
      if (chunk !== undefined) yield chunk;
      if (done) break;
    }
  });
}

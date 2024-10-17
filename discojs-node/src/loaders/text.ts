import createDebug from "debug";
import { createReadStream } from 'node:fs';

import { PreTrainedTokenizer } from '@xenova/transformers';
import { Dataset, Text, models } from "@epfml/discojs";

const debug = createDebug("discojs-node:loaders:text");

/**
 * Returns a Dataset that streams and tokenizes text to yield tokenized sequences
 * one at a time. Each sequence has size `blockSize` + 1, where the first `blockSize`
 * tokens are the input and the last token is the label. The following sequence
 * starts with the last token of the previous sequence (so the previous label is now the 
 * first input token).
 * In other words, the dataset yields sequences of size `blockSize` + 1 but with an overlap
 * of 1 token between each sequence.
 * 
 * @param path path to the text file to read
 * @param tokenizer the tokenizer to use, should match the model that will be trained
 * @param blockSize the context length, the maximum number of tokens of input sequences
 * @param batchSize default to 1, the number of input sequences (of `blockSize` tokens) in each batch. 
 * The batch size is only used to configure the chunk size of the file stream such that each chunk is
 * big enough to contain at least one batch.
 * @param minChunkSize default to 16KiB, the minimum size of each chunk in bits
 * @returns a dataset of tokenized input and label sequences
 */
export function load(path: string, tokenizer: PreTrainedTokenizer,
  blockSize: number, batchSize: number = 1, minChunkSize = 16384): Dataset<Text> {
  return new Dataset(async function* () {
    if (batchSize < 1 || blockSize < 1 || minChunkSize < 1)
      throw new Error("batchSize, blockSize and minChunkSize must be positive integers");
    // we want each chunk to be at least bigger than the block size (each chunk corresponds to a block)
    // (or event bigger than batch size * block size so that each chunk corresponds to a batch)
    const chunkTokenSize = batchSize * (blockSize + 1) // + 1 for the next word label ys
    // We read 8*8 = 8 bytes per expected token to ensure we have enough tokens
    // For reference, the GPT-2 tokenizer encodes 3 to 4 bytes per token on average
    const chunkBitSize = Math.max(minChunkSize, chunkTokenSize * 8 * 8);
    debug("Setting the chunk size to %o bits", chunkBitSize)
    // Create a stream to read the text file chunk by chunk
    const stream = createReadStream(path, {
      encoding: "utf8",
      highWaterMark: chunkBitSize
    });

    // iterate over the chunks
    let endOfPreviousChunk = ""
    let iteration = 0
    for await (const chunk of stream) {
      if (typeof chunk !== 'string') throw new Error('Expected file stream to yield string')
      debug("Reading chunk of size %o", chunk.length)
      // tokenize the whole chunk at once
      // Concatenate with potential leftovers from the previous chunk
      const tokens = models.tokenize(tokenizer, endOfPreviousChunk + chunk, {
        padding: false,
        truncation: false,
        return_tensor: false,
      })
      if (tokens.length < blockSize + 1) {
        // throw if it happens on the 1st iteration
        if (iteration === 0)
          throw new Error(`the chunk (${tokens.length} tokens) is too small ` +
            `to get a sequence of length blockSize (${blockSize + 1} tokens). ` +
            `Either the text file or the chunk size (${chunkBitSize} bits) is too small.`);
        // if this isn't the first iteration we simply skip
        // as we expect the last chunk to be potentially smaller than the block size
        debug("chunk smaller than block size, loading next chunk")
        continue
      }
      debug("batch per chunk: %o", tokens.length / (batchSize * blockSize))
      let currentPosition = 0;
      // yield one block of tokens at a time
      while (currentPosition + blockSize + 1 <= tokens.length) {
        yield tokens.slice(currentPosition, currentPosition + blockSize + 1);
        currentPosition += blockSize; // don't add + 1 here
      }
      // keep the last tokens for the next chunk
      // if this was the last one the remaining tokens are discarded
      if (currentPosition < tokens.length) {
        // We actually need to decode the tokens to get the leftover text
        // instead of simply keeping the remaining tokens.
        // this is because the tokens may be different once prepended to the next chunk
        // e.g. if the remaining text is ". A" and the next chunk starts with "nother"
        // the tokenization will be different than if we simply concatenate the remaining tokens
        endOfPreviousChunk = tokenizer.decode(
          tokens.slice(currentPosition),
          { skip_special_tokens: true }
        )
        debug("End of chunk, remaining text: '%s'", endOfPreviousChunk)
      } else {
        // Note that the difference between tokenizing and then concatenating
        // vs concatenating and then tokenizing can happen if their is no
        // remaining text. We consider this difference negligible
        endOfPreviousChunk = "";
      }
      iteration++;
    }
  });
}

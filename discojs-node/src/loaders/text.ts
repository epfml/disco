import createDebug from "debug";
import { createReadStream } from 'node:fs';
import { Dataset, Text } from "@epfml/discojs";

const debug = createDebug("discojs-node:loaders:text");

/**
 * Returns chunks of text. Use `minChunkSize` to ensure that 
 * each chunk is bigger than the expected sequence length.
 * 
 * @param path path to the text file to read
 * @returns a dataset of tokenized input and label sequences
 */
export function load(path: string): Dataset<Text> {
  return new Dataset(async function* () {
    // Create a stream to read the text file chunk by chunk
    const stream = createReadStream(path, { encoding: "utf8" });
    for await (const chunk of stream) {
      if (typeof chunk !== 'string')
        throw new Error('Expected file stream to yield string')

      debug("yield chunk of length: %o", chunk.length);
      yield chunk
    }
  });
}

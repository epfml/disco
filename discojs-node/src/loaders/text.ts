import * as fs from "node:fs/promises";
import * as readline from "node:readline/promises";

import { Dataset, Text } from "@epfml/discojs";

export function load(path: string): Dataset<Text> {
  return new Dataset(async function* () {
    const input = (await fs.open(path)).createReadStream({ encoding: "utf8" });

    // `readline` is a bit overkill but seems standard
    // https://nodejs.org/api/readline.html#example-read-file-stream-line-by-line
    yield* readline.createInterface({ input, crlfDelay: Infinity });
  });
}

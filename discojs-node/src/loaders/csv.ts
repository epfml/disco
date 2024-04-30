import * as fs from "node:fs/promises";
import { parse as csvParser } from "csv-parse";

import { Dataset } from "@epfml/discojs";

function isRecordOfString(
  raw: unknown,
): raw is Partial<Record<string, string>> {
  if (typeof raw !== "object" || raw === null) return false;

  const record: Partial<Record<string, unknown>> = raw;

  for (const [k, v] of Object.entries(record))
    if (typeof k !== "string" || typeof v !== "string") return false;

  return true;
}

export function load(path: string): Dataset<Partial<Record<string, string>>> {
  return new Dataset(async function* () {
    const stream = (await fs.open(path))
      .createReadStream()
      .pipe(csvParser({ columns: true }));

    for await (const row of stream) {
      if (!isRecordOfString(row))
        throw new Error("excepted object of string to string");
      yield row;
    }
  });
}

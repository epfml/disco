import Papa from "papaparse";

import { Dataset } from "@epfml/discojs";

function isRecordOfString(raw: unknown): raw is Record<string, string> {
  if (typeof raw !== "object" || raw === null) return false;

  const record: Partial<Record<string, unknown>> = raw;

  for (const v of Object.values(record))
    if (typeof v !== "string") return false;

  return true;
}

export function load(file: File): Dataset<Partial<Record<string, string>>> {
  return new Dataset(async function* () {
    // papaparse uses callback for streams and can't easily be converted to async generator
    // maybe another library does it better but I didn't find one at the time
    yield* await new Promise<Record<string, string>[]>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true, // TODO needed to avoid parsing last empty line
        complete(results) {
          if (results.errors.length > 0) {
            reject(results.errors);
            return;
          }

          const rows = results.data.map((row) => {
            if (!isRecordOfString(row))
              throw new Error("excepted object of string to string");

            return row;
          });

          resolve(rows);
        },
      });
    });
  });
}

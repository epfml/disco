import { describe, it, expect } from "vitest";

import { parseCSV } from "./parsers.js";

async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}

describe("csv parser", () => {
  it("loads", async () => {
    const csv = new File([["a,b,c", "1,2,3", "4,5,6"].join("\n")], "csv");

    const parsed = parseCSV(csv);

    expect(await arrayFromAsync(parsed)).to.have.deep.ordered.members([
      { a: "1", b: "2", c: "3" },
      { a: "4", b: "5", c: "6" },
    ]);
  });
});

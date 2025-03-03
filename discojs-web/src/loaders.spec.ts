import { describe, it, expect } from "vitest";
import { loadCSV, loadText } from "./loaders/index.js";

async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}

describe("csv parser", () => {
  it("loads", async () => {
    const csv = new File([["a,b,c", "1,2,3", "4,5,6"].join("\n")], "csv");

    const parsed = loadCSV(csv);

    expect(await arrayFromAsync(parsed)).to.have.deep.ordered.members([
      { a: "1", b: "2", c: "3" },
      { a: "4", b: "5", c: "6" },
    ]);
  });
});

describe("text parser", () => {
  it("loads a simple sequence", async () => {
    const text = ["first", "second", "third"].join("\n")
    
    // jsdom doesn't implement .text on File/Blob
    // trick from https://github.com/jsdom/jsdom/issues/2555
    const file = await (
      await fetch( "data:," + encodeURIComponent(text))
    ).blob();
    const parsed = loadText(file)
    expect(await parsed.size()).to.equal(1);
    expect((await arrayFromAsync(parsed))[0]).to.equal(text);
  });
});

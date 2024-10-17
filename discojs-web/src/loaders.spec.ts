import { AutoTokenizer } from "@xenova/transformers";
import { describe, it, expect } from "vitest";

import { models } from "@epfml/discojs";
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
    
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2')
    const expectedTokens = models.tokenize(tokenizer, text, {
      padding: false,
      truncation: false,
      return_tensor: false,
    })

    // jsdom doesn't implement .text on File/Blob
    // trick from https://github.com/jsdom/jsdom/issues/2555
    const file = await (
      await fetch( "data:," + encodeURIComponent(text))
    ).blob();
    const parsed = loadText(file, tokenizer, 4);

    expect(await parsed.size()).to.equal(1); // expect a single sequence
    expect((await arrayFromAsync(parsed))[0]).to.deep.equal(expectedTokens);
  });

  it("yields the correct block size", async () => {
    const text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed quis faucibus ipsum."
    
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2')
    const expectedTokens = models.tokenize(tokenizer, text, {
      padding: false,
      truncation: false,
      return_tensor: false
    })

    const file = await (
      await fetch("data:," + encodeURIComponent(text))
    ).blob();

    const blockSize = 4
    const parsed = loadText(file, tokenizer, blockSize);
    expect(await parsed.size()).to.equal(Math.floor(expectedTokens.length / blockSize));
      
    let i = 0
    for await (const tokens of parsed) {
      // each sequence should have length blockSize + 1 (for the label)
      expect(tokens).to.deep.equal(expectedTokens.slice(i, i + blockSize + 1));
      // but the window should move by blockSize only
      i += blockSize
    }
  });
});

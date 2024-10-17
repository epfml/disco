import * as fs from "node:fs/promises";
import { withFile } from "tmp-promise";
import { describe, it } from "mocha";
import { expect } from "chai";
import { models } from "@epfml/discojs";
import { AutoTokenizer } from "@xenova/transformers";

import {
  loadCSV,
  loadImage,
  loadImagesInDir,
  loadText,
} from "./loaders/index.js";

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}

describe("csv parser", () => {
  it("parses basic file", async () => {
    await withFile(async ({ path }) => {
      await fs.writeFile(path, ["a,b,c", "1,2,3", "4,5,6"].join("\n"));

      const dataset = loadCSV(path);

      expect(await arrayFromAsync(dataset)).to.have.deep.ordered.members([
        { a: "1", b: "2", c: "3" },
        { a: "4", b: "5", c: "6" },
      ]);
    });
  });
});

describe("image parser", () => {
  it("parses mnist example", async () => {
    const parsed = await loadImage("../datasets/9-mnist-example.png");

    expect(parsed).to.have.property("width").that.equals(172);
    expect(parsed).to.have.property("height").that.equals(178);
  });
});

describe("image directory parser", () => {
  it("parses all cifar10 files", async () => {
    const parsed = await loadImagesInDir("../datasets/CIFAR10");

    expect(await parsed.size()).to.equal(24);
  });
});

describe("text parser", () => {
  
  it("parses basic file", async () => {
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2')
    await withFile(async ({ path }) => {
      const text = ["a", "b", "c"].join("\n")
      await fs.writeFile(path, text);
      // set block size to 4 to get 1 sequence of 4 tokens + 1 label token
      const parsed = loadText(path, tokenizer, 4, 1);
      expect(await parsed.size()).to.equal(1);
      const next = await parsed[Symbol.asyncIterator]().next()
      expect(next.done).to.be.false;
      
      const tokens = next.value as number[]
      const expectedTokens = models.tokenize(tokenizer, text, {
        padding: false,
        truncation: false,
        return_tensor: false
      })
      expect(tokens).to.deep.equal(expectedTokens);
    });
  });

  it("yields the correct block size", async () => {
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2')
    await withFile(async ({ path }) => {
      const text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
      const expectedTokens = models.tokenize(tokenizer, text, {
        padding: false,
        truncation: false,
        return_tensor: false
      })
      await fs.writeFile(path, text);

      // set block size to 4 to get 1 sequence of 4 tokens + 1 label token
      // so we expect 5 tokens per read
      const blockSize = 4
      const parsed = loadText(path, tokenizer, blockSize, 1);
      // expect the number of sequences to be the total number of tokens divided by blockSize
      // we use floor because the last incomplete sequence is dropped
      expect(await parsed.size()).to.equal(Math.floor(expectedTokens.length / blockSize));
      
      let i = 0
      for await (const tokens of parsed) {
        // each sequence should have length blockSize + 1 (for the label)
        expect(tokens).to.deep.equal(expectedTokens.slice(i, i + blockSize + 1));
        // but the window should move by blockSize only
        i += blockSize
      }
    })
  });

  it("reads multiple chunks", async () => {
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2')
    await withFile(async ({ path }) => {
      const text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sed risus maximus, ultricies ex sed, dictum elit. Curabitur faucibus egestas enim et auctor. Quisque vel dignissim turpis. Curabitur justo tellus, elementum sit amet erat eget, auctor ornare nisi. Nunc tortor odio, ultrices id leo vitae, euismod congue ex. Curabitur arcu leo, sagittis quis felis nec, imperdiet aliquet tellus. Integer a mollis nulla. Quisque pulvinar lectus eget nisi pharetra, non molestie magna ullamcorper. Sed porttitor diam non blandit molestie. Duis tristique arcu ut efficitur efficitur. Fusce et ullamcorper tortor. Pellentesque a accumsan lacus, nec mollis risus. Nunc quis eros a orci ultricies cursus. Maecenas sodales ipsum a magna malesuada efficitur. Maecenas at sapien blandit, egestas nisi eu, mollis elit."
      const expectedTokens = models.tokenize(tokenizer, text, {
        padding: false,
        truncation: false,
        return_tensor: false
      })
      await fs.writeFile(path, text);

      // set block size to 4 to get 1 sequence of 4 tokens + 1 label token
      // so we expect 5 tokens per read
      const blockSize = 4
      const parsed = loadText(path, tokenizer, blockSize, 1, 1); // set the min chunk size allowed to 1 bit
      // expect the number of sequences to be the total number of tokens divided by blockSize
      // we use floor because the last incomplete sequence is dropped
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
});

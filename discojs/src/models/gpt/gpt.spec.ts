import { expect } from "chai";
import "@tensorflow/tfjs-node"; // speed up
import { AutoTokenizer } from "@xenova/transformers";

import { Dataset, ModelEncoded } from "../../index.js";

import { GPT } from "./index.js";
import type { GPTConfig } from "./config.js";
import { List, Repeat } from "immutable";

describe("gpt-tfjs", function () {
  const data = "Lorem ipsum dolor sit";

  const config: GPTConfig = {
    modelType: "gpt-nano",
    lr: 0.01,
    maxIter: 10,
    evaluateEvery: 10,
    maxEvalBatches: 10,
    blockSize: 8,
    vocabSize: 50258,
  };

  it("can overfit one sentence", async function () {
    this.timeout("2m");

    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/gpt2");
    const tokenDataset = new Dataset(Repeat(data))
      .map<ModelEncoded["text"]>((text) => {
        const { input_ids: tokens } = tokenizer(text, {
          padding: true,
          truncation: true,
          return_tensor: false,
          max_length: config.blockSize + 1,
        }) as { input_ids: number[] };

        return [List(tokens.slice(0, config.blockSize)), List(tokens.slice(1))];
      })
      .batch(64);

    const model = new GPT(config);
    for (let i = 0; i < 5; i++)
      for await (const _ of model.train(tokenDataset, undefined));

    const generation = await model.generate("Lorem ipsum dolor", tokenizer, 1);

    expect(generation).equal(data); // Assert that the model completes 'Lorem ipsum dolor' with 'sit'
  });
});

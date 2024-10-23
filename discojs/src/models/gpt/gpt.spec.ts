import { expect } from "chai";
import "@tensorflow/tfjs-node"; // speed up
import { AutoTokenizer } from "@xenova/transformers";

import { Dataset, DataFormat } from "../../index.js";

import { GPT } from "./index.js";
import { List, Repeat } from "immutable";

describe("gpt-tfjs", function () {
  it("can overfit one sentence", async function () {
    this.timeout("2m");
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/gpt2");

    const data = "Lorem ipsum dolor sit";
    const dataTokens = List(
      (tokenizer(data, { return_tensor: false }) as { input_ids: number[] })
        .input_ids,
    );
    const dataset = new Dataset<DataFormat.ModelEncoded["text"]>(
      Repeat([dataTokens.pop(), dataTokens.last()]),
    ).batch(64);

    const model = new GPT({
      modelType: "gpt-nano",
      lr: 0.01,
      maxIter: 10,
      evaluateEvery: 10,
      maxEvalBatches: 10,
      blockSize: 8,
      vocabSize: 50258,
    });
    for (let i = 0; i < 5; i++)
      for await (const _ of model.train(dataset, undefined));

    const input = "Lorem ipsum dolor";
    const inputTokens = List(
      (tokenizer(input, { return_tensor: false }) as { input_ids: number[] })
        .input_ids,
    );
    const outputToken: number = (
      await model.predict(List.of(inputTokens))
    ).first();
    const output = tokenizer.decode([outputToken]);

    expect(input + output).equal(data); // Assert that the model completes 'Lorem ipsum dolor' with 'sit'
  });
});

import { expect } from "chai";
import "@tensorflow/tfjs-node"; // speed up

import type { DataFormat } from "../../index.js";
import { Dataset, Tokenizer } from "../../index.js";

import { GPT } from "./index.js";
import { List } from "immutable";

describe("gpt-tfjs", function () {
  it("can overfit one sentence", async function () {
    this.timeout("1m");
    const tokenizer = await Tokenizer.from_pretrained("Xenova/gpt2");

    const data = "Lorem ipsum dolor sit";
    const dataTokens = tokenizer.tokenize(data);
		const lastToken = dataTokens.last();
		if (lastToken === undefined) throw new Error("no token generated");
    const seed = 42
		const dataset = new Dataset<DataFormat.ModelEncoded["text"]>([
			[dataTokens.pop(), lastToken],
		])
			.repeat()
			.batch(8);

    const model = new GPT({
      modelType: "gpt-nano",
      lr: 0.01,
      maxIter: 10,
      evaluateEvery: 50,
      maxEvalBatches: 10,
      contextLength: 8,
      seed
    });
    for (let i = 0; i < 5; i++)
      for await (const _ of model.train(dataset, undefined));

    const input = "Lorem ipsum dolor";
    const inputTokens = tokenizer.tokenize(data);
    
		const outputToken = (
			await model.predict(List.of(inputTokens), { seed })
		).first();
		if (outputToken === undefined) throw new Error("empty prediction");
    const output = tokenizer.decode([outputToken]);

    expect(input + output).equal(data); // Assert that the model completes 'Lorem ipsum dolor' with 'sit'
  });
});

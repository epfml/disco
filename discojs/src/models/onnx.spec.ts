import { describe, expect, it } from "vitest";

import { List } from "immutable";
import { AutoTokenizer } from "@xenova/transformers";
import { ONNXModel } from "./onnx.js";
import { DefaultGenerationConfig } from "./implementations/gpt/config.js";

describe("ONNXModel.predict", { timeout: 50_000 }, () => {
  it("should generate the next token ID from a prompt", async () => {
    // Load tokenizer and model
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/gpt2");
    const model = await ONNXModel.init_pretrained("Xenova/gpt2");

    // Tokenize input text
    const prompt = "Disco is the greatest framework for";
    const tokenized = tokenizer(prompt, { return_tensor: false }) as {
      input_ids: number[];
    };

    // Prepare batch input (List<List<number>>)
    const inputIds = List(tokenized.input_ids);
    const batch = List([inputIds]);

    // Run prediction
    const predictions = await model.predict(batch, DefaultGenerationConfig);

    // Assertions
    expect(predictions.size).to.equal(1);
    const nextTokenId = predictions.get(0);
    expect(typeof nextTokenId).to.equal("number");
    expect(Number.isInteger(nextTokenId)).to.be.true;

    console.log(`Prompt: "${prompt}"`);
    console.log("Predicted token ID:", nextTokenId);

    if (nextTokenId === undefined) throw new Error("empty prediction");
    const output = tokenizer.decode([nextTokenId]);
    console.log("Predicted text:", output);
  });
});

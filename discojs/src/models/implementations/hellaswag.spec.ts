import { describe, expect, it } from "vitest";

import { evaluate } from "./hellaswag.js";
import { GPT, Tokenizer } from "../index.js";
import { ONNXModel } from "../onnx.js";
import type { HellaSwagExample } from "./hellaswag.js";

const exampleDataset: HellaSwagExample[] = [
  {
    ctx: "A man is sitting on a roof. he",
    endings: [
      "is using wrap to wrap a pair of skis.",
      "is ripping level tiles off.",
      "is holding a rubik's cube.",
      "starts pulling up roofing on a roof.",
    ],
    label: 3,
  },
  {
    ctx: "A lady walks to a barbell. She bends down and grabs the pole. the lady",
    endings: [
      "swings and lands in her arms.",
      "pulls the barbell forward.",
      "pulls a rope attached to the barbell.",
      "stands and lifts the weight over her head.",
    ],
    label: 3,
  },
];

describe("HellaSwag Evaluator", { timeout: 10_000 }, () => {
  it("evaluates tfjs GPT model", async () => {
    const tokenizer = await Tokenizer.from_pretrained("Xenova/gpt2");
    const gpt = new GPT({ seed: 42 }); // seed for reproducibility

    const accuracy = await evaluate(gpt, tokenizer, exampleDataset, true);
    expect(accuracy).to.be.gte(0);
    expect(accuracy).to.be.lte(1);
  });
});

describe("HellaSwag Evaluator with Xenova GPT-2", { timeout: 50_000 }, () => {
  it("evaluates the pretrained GPT-2 model", async () => {
    const tokenizer = await Tokenizer.from_pretrained("Xenova/gpt2");
    const model = await ONNXModel.init_pretrained("Xenova/gpt2");

    const accuracy = await evaluate(model, tokenizer, exampleDataset, true);
    expect(accuracy).to.be.gte(0);
    expect(accuracy).to.be.lte(1);
  });
});

describe(
  "Deterministic evaluation with tfjs GPT-2",
  { timeout: 10_000 },
  () => {
    it("returns the same accuracy across runs", async () => {
      const tokenizer = await Tokenizer.from_pretrained("Xenova/gpt2");
      const gpt = new GPT({ seed: 42 });

      const accuracy1 = await evaluate(gpt, tokenizer, exampleDataset, false);
      const accuracy2 = await evaluate(gpt, tokenizer, exampleDataset, false);

      expect(accuracy1).to.equal(accuracy2);
    });
  },
);

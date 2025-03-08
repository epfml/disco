import { expect } from "chai";
import { AutoTokenizer } from "@xenova/transformers";
import { tokenize } from "./tokenize.js";

describe("Multi-Tokenizer Tests", function () {
  this.timeout(200000);

  const sampleText = "Hello, world! This is a test string to check tokenization.";

  // List of tokenizer names to test
  const tokenizerNames = [
    "Xenova/gpt2",
    "Xenova/llama-3-tokenizer",
    "Xenova/bert-base-uncased",
    "Xenova/roberta-base",
    "Xenova/distilbert-base-uncased"
  ];

  tokenizerNames.forEach((name) => {
    it(`should tokenize text using tokenizer "${name}"`, async () => {
      const tokenizer = await AutoTokenizer.from_pretrained(name);
      const tokens = tokenize(tokenizer, sampleText);
      const tokenArray = tokens.toArray();

      // Checks that we got a non-empty array of tokens and that each token is a number.
      expect(tokenArray).to.be.an("array").that.is.not.empty;
      tokenArray.forEach((token) => {
        expect(token).to.be.a("number");
      });
    });
  });
});

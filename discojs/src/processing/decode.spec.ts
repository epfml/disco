import { expect } from "chai";
import { AutoTokenizer } from "@xenova/transformers";
import { encodeDecode } from "./decode.js";

describe("Encode-Decode tokenization", function () {
  this.timeout(20000);

  it("should return text close to the original after encode-decode tokenization using GPT2 tokenizer", async function () {
    // Load the GPT2 tokenizer
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/gpt2");
    const originalText = "Hello, world! This is a test for encode-decode tokenization.";
    
    // Perform round-trip tokenization
    const decodedText = encodeDecode(tokenizer, originalText);
    
    // Normalize both strings to account for minor tokenization differences
    const normalizedOriginal = originalText.trim().toLowerCase();
    const normalizedDecoded = decodedText.trim().toLowerCase();
    
    // Check that the decoded text is almost equal to the original text
    expect(normalizedDecoded).to.equal(normalizedOriginal);
  });
});

import { expect } from "chai";

import { tokenize } from "./text.js";
import { AutoTokenizer } from "@xenova/transformers";
import { Repeat } from "immutable";

describe("text processing", () => {
  const text = [
    "Hello world, a bc 1 2345, '? 976. Wikipedia is a free content online encyclopedia",
    "written and maintained by a community \n of volunteers, known as Wikipedians.",
    "Founded by Jimmy Wales and Larry Sanger on January 15, 2001, Wikipedia is hosted by the",
    "Wikimedia Foundation, an American nonprofit organization that employs a staff of over 700 people.[7]"
  ].join(" ");

  const expectedTokens = [
    15496, 995, 11, 257, 47125, 352, 2242, 2231, 11, 705, 30, 860, 4304, 13,
    15312, 318, 257, 1479, 2695, 2691, 45352, 3194, 290, 9456, 416, 257, 2055,
    220, 198, 286, 11661, 11, 1900, 355, 11145, 46647, 1547, 13, 4062, 276, 416,
    12963, 11769, 290, 13633, 311, 2564, 319, 3269, 1315, 11, 5878, 11, 15312,
    318, 12007, 416, 262, 44877, 5693, 11, 281, 1605, 15346, 4009, 326, 24803,
    257, 3085, 286, 625, 13037, 661, 3693, 22, 60,
  ];

  const shortText = 'import { AutoTokenizer } from "@xenova/transformers";' 
  // with GPT 2 tokenizer
  const shortExpectedTokens = [
    11748, 1391, 11160, 30642, 7509, 1782, 422,
    44212, 87, 268, 10071, 14, 35636, 364, 8172
  ]

  it("can tokenize text with the Llama 3 tokenizer", async () => {
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/llama-3-tokenizer");
    // Tokenizer playgrounds aren't consistent: https://github.com/huggingface/transformers.js/issues/1019
    // Tokenization with python:
    // from transformers import AutoTokenizer
    // tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B")
    // tokenizer.encode(text, add_special_tokens=False)
    const expectedTokens = [
      9906, 1917, 11, 264, 18399, 220, 16, 220, 11727, 20, 11, 32167,
      220, 25208, 13, 27685, 374, 264, 1949, 2262, 2930, 83708, 5439, 323, 18908,
      555, 264, 4029, 720, 315, 23872, 11, 3967, 439, 119234, 291, 5493, 13, 78811,
      555, 28933, 23782, 323, 30390, 328, 4091, 389, 6186, 220, 868, 11, 220, 1049,
      16, 11, 27685, 374, 21685, 555, 279, 90940, 5114, 11, 459, 3778, 33184, 7471,
      430, 51242, 264, 5687, 315, 927, 220, 7007, 1274, 8032, 22, 60
    ]
    const tokens = tokenize(tokenizer, text);
    expect(tokens.toArray()).to.be.deep.equal(expectedTokens);
  });

  it("can tokenize text with the GPT2 tokenizer", async () => {
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/gpt2");

    const tokens = tokenize(tokenizer, text);
    expect(tokens.toArray()).to.be.deep.equal(expectedTokens);
  });

  it("truncates until expected length", async () => {
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/gpt2");

    const tokens = tokenize(tokenizer, text, {truncation: true, max_length: 10});
    expect(tokens.toArray()).to.be.deep.equal(expectedTokens.slice(0, 10));
  });

  it("pads sequence until enough token are generated", async () => {
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/gpt2");
    const max_length = 20

    const tokens = tokenize(tokenizer, shortText, {padding: true, max_length});
    const paddedSequence = Repeat(tokenizer.pad_token_id, max_length - shortExpectedTokens.length)
      .concat(shortExpectedTokens).toArray();
    expect(tokens.toArray()).to.be.deep.equal(paddedSequence);
  });
    
  it("can pad on right side", async () => {
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/gpt2");
    const max_length = 20
    
    const tokens = tokenize(tokenizer, shortText, {padding: true, padding_side: 'right', max_length});
    const paddedSequence = shortExpectedTokens.concat(
      Repeat(tokenizer.pad_token_id, max_length - shortExpectedTokens.length).toArray()
    );
    expect(tokens.toArray()).to.be.deep.equal(paddedSequence);
  });
});
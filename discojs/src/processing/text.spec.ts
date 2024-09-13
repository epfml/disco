import { expect } from "chai";

import { tokenizeAndLeftPad } from "./text.js";
import { AutoTokenizer } from "@xenova/transformers";
import { Repeat } from "immutable";

describe("text processing", () => {
  const text =
    "Hello world, a bc 1 2345, '? 976. Wikipedia is a free content online encyclopedia written and maintained by a community \n of volunteers, known as Wikipedians. Founded by Jimmy Wales and Larry Sanger on January 15, 2001, Wikipedia is hosted by the Wikimedia Foundation, an American nonprofit organization that employs a staff of over 700 people.[7]";
  const expectedTokens = [
    15496, 995, 11, 257, 47125, 352, 2242, 2231, 11, 705, 30, 860, 4304, 13,
    15312, 318, 257, 1479, 2695, 2691, 45352, 3194, 290, 9456, 416, 257, 2055,
    220, 198, 286, 11661, 11, 1900, 355, 11145, 46647, 1547, 13, 4062, 276, 416,
    12963, 11769, 290, 13633, 311, 2564, 319, 3269, 1315, 11, 5878, 11, 15312,
    318, 12007, 416, 262, 44877, 5693, 11, 281, 1605, 15346, 4009, 326, 24803,
    257, 3085, 286, 625, 13037, 661, 3693, 22, 60,
  ];

  it("tokenizes text", async () => {
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/gpt2");

    const tokens = tokenizeAndLeftPad(text, tokenizer, expectedTokens.length);

    expect(tokens.toArray()).to.be.deep.equal(expectedTokens);
  });

  it("tokenizes until wanted size", async () => {
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/gpt2");

    const tokens = tokenizeAndLeftPad(text, tokenizer, 10);

    expect(tokens.toArray()).to.be.deep.equal(expectedTokens.slice(0, 10));
  });

  it("pads until enough token are generated", async () => {
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/gpt2");

    const tokens = tokenizeAndLeftPad("", tokenizer, 10);

    expect(tokens.toArray()).to.be.deep.equal(
      Repeat(tokenizer.pad_token_id, 10).toArray(),
    );
  });
});

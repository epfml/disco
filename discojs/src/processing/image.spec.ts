import { expect } from "chai";
import { Repeat, Seq } from "immutable";

import { Image } from "../index.js";

import { removeAlpha, resize } from "./image.js";

describe("resize", () => {
  it("doesn't change with same image dimensions", () => {
    const base = new Image(Uint8Array.of(1, 2, 3, 4, 5, 6), 2, 1, 3);

    const resized = resize(base.width, base.height, base);

    expect(removeAlpha(resized)).to.be.deep.equal(base);
  });

  it("copies single pixel image to every pixel", () => {
    const base = new Image(Uint8Array.of(1, 2, 3), 1, 1, 3);

    const resized = resize(2, 3, base);

    expect(removeAlpha(resized).data).to.have.same.ordered.members(
      Repeat(Seq.Indexed.of(1, 2, 3), 6)
        .flatten()
        .toArray(),
    );
  });
});

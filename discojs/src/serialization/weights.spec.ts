import { assert, describe, it } from "vitest";

import { WeightsContainer } from "#weights/index";
import { isEncoded } from "#serialization/coder";
import { encode, decode } from "#serialization/weights";

describe("weights", () => {
  it("can encode what it decodes", async () => {
    const weights = WeightsContainer.of([1], [2], [3]);

    const encoded = await encode(weights);
    assert.isTrue(isEncoded(encoded));
    const decoded = decode(encoded);

    assert.sameDeepOrderedMembers(
      Array.from(
        (
          await Promise.all(
            decoded.weights.map(async (w) => await w.data<"float32">()),
          )
        ).entries(),
      ),
      Array.from(
        (
          await Promise.all(
            weights.weights.map(async (w) => await w.data<"float32">()),
          )
        ).entries(),
      ),
    );
  });
});

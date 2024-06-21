import { expect } from "chai";

import { split, gather } from "./async_iterator.js";

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}

describe("gather", () => {
  it("returns generator value", async () => {
    const [yielded, returned] = await gather(
      // eslint-disable-next-line @typescript-eslint/require-await
      (async function* () {
        yield "yield";
        return "return";
      })(),
    );

    expect(yielded.toArray()).to.have.same.ordered.members(["yield"]);
    expect(returned).to.equals("return");
  });
});

describe("split", () => {
  it("returns both iterator and return value", async () => {
    const [gen, ret] = split(
      // eslint-disable-next-line @typescript-eslint/require-await
      (async function* () {
        yield "yield";
        return "return";
      })(),
    );

    expect(await arrayFromAsync(gen)).to.have.same.ordered.members(["yield"]);
    expect(await ret).to.equals("return");
  });

  it("throws returned when iterator throws", async () => {
    const [gen, ret] = split(
      // eslint-disable-next-line require-yield, @typescript-eslint/require-await
      (async function* () {
        throw new Error();
      })(),
    );

    try {
      for await (const _ of gen);
    } catch {
      // expected
    }

    try {
      await ret;
    } catch {
      return; // all good
    }

    expect(false, "should have thrown").to.be.true;
  });
});

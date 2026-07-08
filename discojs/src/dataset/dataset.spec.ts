import { List, Range } from "immutable";
import { describe, expect, it } from "vitest";
import { Dataset } from "./dataset.js";

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}

describe("dataset", () => {
  it("can be constructed with sync iterable", async () => {
    const dataset = new Dataset([1, 2, 3]);

    expect(await arrayFromAsync(dataset)).to.have.ordered.members([1, 2, 3]);
  });

  it("can be constructed with async generator", async () => {
    // eslint-disable-next-line @typescript-eslint/require-await
    const dataset = new Dataset(async function* () {
      yield 1;
      yield 2;
      yield 3;
    });

    expect(await arrayFromAsync(dataset)).to.have.ordered.members([1, 2, 3]);
  });

  it("returns all on left when splitting with 0", async () => {
    const dataset = new Dataset([1, 2, 3]);

    const [left, right] = dataset.split(0);

    expect(await arrayFromAsync(left)).to.have.ordered.members([1, 2, 3]);
    expect(await arrayFromAsync(right)).to.be.empty;
  });

  it("returns all on right when splitting with 1", async () => {
    const dataset = new Dataset([1, 2, 3]);

    const [left, right] = dataset.split(1);

    expect(await arrayFromAsync(left)).to.be.empty;
    expect(await arrayFromAsync(right)).to.have.ordered.members([1, 2, 3]);
  });

  it("splits equally with a ratio of 0.5", async () => {
    const dataset = new Dataset([1, 2, 3, 4]);

    const [left, right] = dataset.split(0.5);

    expect(await arrayFromAsync(left)).to.have.length(2);
    expect(await arrayFromAsync(right)).to.have.length(2);
  });

  it("splits well with a ratio of 1/3", async () => {
    const dataset = new Dataset([1, 2, 3]);

    const [left, right] = dataset.split(1 / 3);

    expect(await arrayFromAsync(left)).to.have.length(2);
    expect(await arrayFromAsync(right)).to.have.length(1);
  });

  it("batches in same sized chunks", async () => {
    const dataset = new Dataset([1, 2, 3, 4]);

    const batched = dataset.batch(2);

    expect(
      (await arrayFromAsync(batched)).map((l) => l.toArray()),
    ).to.have.deep.ordered.members([
      [1, 2],
      [3, 4],
    ]);
  });

  it("batches with a trailing smaller chunk", async () => {
    const dataset = new Dataset([1, 2, 3]);

    const batched = dataset.batch(2);

    expect(
      (await arrayFromAsync(batched)).map((l) => l.toArray()),
    ).to.have.deep.ordered.members([[1, 2], [3]]);
  });

  it("maps to the same size", async () => {
    const dataset = new Dataset([1, 2, 3]);

    const mapped = dataset.map((n) => n.toString());

    expect(await arrayFromAsync(mapped)).to.have.ordered.members([
      "1",
      "2",
      "3",
    ]);
  });

  it("maps with promises", async () => {
    const dataset = new Dataset([1, 2, 3]);

    const mapped = dataset.map(async (n) => Promise.resolve(n));

    expect(await arrayFromAsync(mapped)).to.have.ordered.members([1, 2, 3]);
  });

  it("chains with dataset", async () => {
    const left = new Dataset([1, 2, 3]);
    const right = new Dataset([4, 5, 6]);

    const chained = left.chain(right);

    expect(await arrayFromAsync(chained)).to.have.ordered.members([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("zips with other dataset", async () => {
    const dataset = new Dataset([1, 2, 3]);

    const zipped = dataset.zip(dataset);

    expect(await arrayFromAsync(zipped)).to.have.deep.ordered.members([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it("zips with non-async iterable", async () => {
    const dataset = new Dataset([1, 2, 3]);

    const zipped = dataset.zip(Range(0, Number.POSITIVE_INFINITY));

    expect(await arrayFromAsync(zipped)).to.have.deep.ordered.members([
      [1, 0],
      [2, 1],
      [3, 2],
    ]);
  });

  it("batches with overlap", async () => {
    const dataset = new Dataset([1, 2, 3]);

    const batched = dataset.batch(2, 1);

    expect(
      (await arrayFromAsync(batched)).map((l) => l.toArray()),
    ).to.have.deep.ordered.members([
      [1, 2],
      [2, 3],
    ]);
  });

  it("batch with overlap yields correct batches", async () => {
    const expectedTokens = Range(0, 53).toList();
    const contextLength = 4;

    const parsed = new Dataset([expectedTokens])
      .flatten()
      .batch(contextLength + 1, 1);

    // -1 because the last sequence is dropped as there is no next token label
    const expectedLength = Math.ceil(expectedTokens.size / contextLength) - 1;
    expect(await parsed.size()).to.equal(expectedLength);

    // exclude the last sequence because it has been padded
    let sequences = List(await arrayFromAsync(parsed));
    // we expect the last sequence to have contextLength + 1 tokens via padding
    expect(sequences.last()?.size).to.equal(contextLength + 1);
    sequences = sequences.pop();
    let i = 0;
    for (const tokens of sequences) {
      // each sequence has length contextLength + 1 (for the label)
      expect(tokens.toArray()).to.deep.equal(
        expectedTokens.slice(i, i + contextLength + 1).toArray(),
      );
      // but the window should move by contextLength only
      i += contextLength;
    }
  });

  it("repeats content infinitely", async () => {
    const dataset = new Dataset([0, 1, 2]).repeat();
    const iter = dataset[Symbol.asyncIterator]();

    for (const i of Range(0, 10)) {
      const e = await iter.next();
      expect(e.done).to.be.false;
      expect(e.value).to.equal(i % 3);
    }
  });

  it("repeats content a fixed number of times", async () => {
    const dataset = new Dataset([0, 1]).repeat(3);
    expect([0, 1, 0, 1, 0, 1]).to.deep.equal(await arrayFromAsync(dataset));
  });
});

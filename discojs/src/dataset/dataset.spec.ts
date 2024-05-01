import { expect } from "chai";
import { Dataset } from "./dataset.js";
import { Range } from "immutable";

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}

describe("dataset", () => {
  it("returns all on left when splitting with 0", async () => {
    const dataset = new Dataset(async function* () {
      yield Promise.resolve(1);
      yield Promise.resolve(2);
      yield Promise.resolve(3);
    });

    const [left, right] = dataset.split(0);

    expect(await arrayFromAsync(left)).to.have.ordered.members([1, 2, 3]);
    expect(await arrayFromAsync(right)).to.be.empty;
  });

  it("returns all on right when splitting with 1", async () => {
    const dataset = new Dataset(async function* () {
      yield Promise.resolve(1);
      yield Promise.resolve(2);
      yield Promise.resolve(3);
    });

    const [left, right] = dataset.split(1);

    expect(await arrayFromAsync(left)).to.be.empty;
    expect(await arrayFromAsync(right)).to.have.ordered.members([1, 2, 3]);
  });

  it("splits equally with a ratio of 0.5", async () => {
    const dataset = new Dataset(async function* () {
      yield Promise.resolve(1);
      yield Promise.resolve(2);
      yield Promise.resolve(3);
      yield Promise.resolve(4);
    });

    const [left, right] = dataset.split(0.5);

    expect(await arrayFromAsync(left)).to.have.length(2);
    expect(await arrayFromAsync(right)).to.have.length(2);
  });

  it("splits well with a ratio of 1/3", async () => {
    const dataset = new Dataset(async function* () {
      yield Promise.resolve(1);
      yield Promise.resolve(2);
      yield Promise.resolve(3);
    });

    const [left, right] = dataset.split(1 / 3);

    expect(await arrayFromAsync(left)).to.have.length(2);
    expect(await arrayFromAsync(right)).to.have.length(1);
  });

  it("batches in samed sized chunks", async () => {
    const dataset = new Dataset(async function* () {
      yield Promise.resolve(1);
      yield Promise.resolve(2);
      yield Promise.resolve(3);
      yield Promise.resolve(4);
    });

    const batched = dataset.batch(2);

    expect(
      (await arrayFromAsync(batched)).map((l) => l.toArray()),
    ).to.have.deep.ordered.members([
      [1, 2],
      [3, 4],
    ]);
  });

  it("batches with a trailing smaller chunk", async () => {
    const dataset = new Dataset(async function* () {
      yield Promise.resolve(1);
      yield Promise.resolve(2);
      yield Promise.resolve(3);
    });

    const batched = dataset.batch(2);

    expect(
      (await arrayFromAsync(batched)).map((l) => l.toArray()),
    ).to.have.deep.ordered.members([[1, 2], [3]]);
  });

  it("maps to the same size", async () => {
    const dataset = new Dataset(async function* () {
      yield Promise.resolve(1);
      yield Promise.resolve(2);
      yield Promise.resolve(3);
    });

    const mapped = dataset.map((n) => n.toString());

    expect(await arrayFromAsync(mapped)).to.have.ordered.members([
      "1",
      "2",
      "3",
    ]);
  });

  it("maps with promises", async () => {
    const dataset = new Dataset(async function* () {
      yield Promise.resolve(1);
      yield Promise.resolve(2);
      yield Promise.resolve(3);
    });

    const mapped = dataset.map(async (n) => Promise.resolve(n));

    expect(await arrayFromAsync(mapped)).to.have.ordered.members([1, 2, 3]);
  });

  it("chains with dataset", async () => {
    const left = new Dataset(async function* () {
      yield Promise.resolve(1);
      yield Promise.resolve(2);
      yield Promise.resolve(3);
    });
    const right = new Dataset(async function* () {
      yield Promise.resolve(4);
      yield Promise.resolve(5);
      yield Promise.resolve(6);
    });

    const chained = left.chain(right);

    expect(await arrayFromAsync(chained)).to.have.ordered.members([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("zips with other dataset", async () => {
    const dataset = new Dataset(async function* () {
      yield Promise.resolve(1);
      yield Promise.resolve(2);
      yield Promise.resolve(3);
    });

    const zipped = dataset.zip(dataset);

    expect(await arrayFromAsync(zipped)).to.have.deep.ordered.members([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it("zips with non-async iterable", async () => {
    const dataset = new Dataset(async function* () {
      yield Promise.resolve(1);
      yield Promise.resolve(2);
      yield Promise.resolve(3);
    });

    const zipped = dataset.zip(Range());

    expect(await arrayFromAsync(zipped)).to.have.deep.ordered.members([
      [1, 0],
      [2, 1],
      [3, 2],
    ]);
  });
});

import { expect } from "chai";
import { Set } from "immutable";

import { WeightsContainer } from "../index.js";
import { MeanAggregator } from "./mean.js";

async function WSIntoArrays(ws: WeightsContainer): Promise<number[][]> {
  return (await Promise.all(ws.weights.map(async (w) => await w.data()))).map(
    (arr) => [...arr],
  );
}

describe("mean aggregator", () => {
  it("updates only within round cutoff", () => {
    const aggregator = new MeanAggregator(undefined, 1, 3);
    aggregator.setNodes(
      Set.of("first client", "second client", "third client"),
    );

    // round 0

    expect(aggregator.add("first client", WeightsContainer.of(), 0)).to.be.true;

    aggregator.nextRound();
    // round 1

    expect(aggregator.add("second client", WeightsContainer.of(), 0)).to.be
      .true;
    expect(aggregator.add("first client", WeightsContainer.of(), 1)).to.be.true;

    aggregator.nextRound();
    // round 2

    expect(aggregator.add("third client", WeightsContainer.of(), 0)).to.be
      .false;
    expect(aggregator.add("second client", WeightsContainer.of(), 1)).to.be
      .true;
    expect(aggregator.add("first client", WeightsContainer.of(), 2)).to.be.true;
  });

  it("returns the mean of the weights", async () => {
    const aggregator = new MeanAggregator(undefined, 0, 2);
    aggregator.setNodes(Set.of("first client", "second client"));

    const results = aggregator.receiveResult();

    aggregator.add("first client", WeightsContainer.of([0], [1]), 0);
    aggregator.add("second client", WeightsContainer.of([2], [3]), 0);

    expect(await WSIntoArrays(await results)).to.deep.equal([[1], [2]]);
  });
});

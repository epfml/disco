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
  it("updates only within round cutoff", async () => {
    const aggregator = new MeanAggregator(1, 1, 'relative'); // use a round cutoff of 1
    aggregator.setNodes(Set.of("client 1"));

    // round 0
    expect(aggregator.round).to.equal(0)
    expect(aggregator.isValidContribution("client 1", 0)).to.be.true;
    const client1Round0Promise = aggregator.getPromiseForAggregation();
    aggregator.add("client 1", WeightsContainer.of([1]), 0);
    expect(WeightsContainer.of([1]).equals(await client1Round0Promise)).to.be.true
    expect(aggregator.round).to.equal(1)
    
    // round 1
    aggregator.registerNode("client 2");
    expect(aggregator.isValidContribution("client 2", 0)).to.be.true; // round 0 should be within the cutoff
    aggregator.add("client 1", WeightsContainer.of([1]), 1);
    const client2Round0Promise =  aggregator.getPromiseForAggregation();
    aggregator.add("client 2", WeightsContainer.of([2]), 0);
    expect(WeightsContainer.of([1.5]).equals(await client2Round0Promise)).to.be.true
    expect(aggregator.round).to.equal(2)
    
    // round 2
    aggregator.registerNode("client 3");
    expect(aggregator.isValidContribution("client 3", 0)).to.be.false; // round 0 is now out of the cutoff
    expect(aggregator.isValidContribution("client 3", 1)).to.be.true;
    aggregator.add("client 1", WeightsContainer.of([1]), 2);
    aggregator.add("client 2", WeightsContainer.of([1]), 2);
    const client3Round2Promise = aggregator.getPromiseForAggregation();
    aggregator.add("client 3", WeightsContainer.of([4]), 1);
    expect(WeightsContainer.of([2]).equals(await client3Round2Promise)).to.be.true
    expect(aggregator.round).to.equal(3)
  });

  it("returns the mean of the weights", async () => {
    const aggregator = new MeanAggregator(0, 2, 'absolute');
    const [id1, id2] = ["client 1", "client 2"]

    aggregator.setNodes(Set.of(id1, id2));

    const results = new Promise<WeightsContainer>((resolve) =>
      aggregator.once("aggregation", resolve),
    );

    const result1 = aggregator.getPromiseForAggregation();
    aggregator.add(id1, WeightsContainer.of([0], [1]), 0);
    const result2 = aggregator.getPromiseForAggregation();
    aggregator.add(id2, WeightsContainer.of([2], [3]), 0);
    expect((await result1).equals(await result2)).to.be.true

    expect(await WSIntoArrays(await results)).to.deep.equal([[1], [2]]);
  });

  it("waits for 100% of the contributions by default", async () => {
    const aggregator = new MeanAggregator();
    const [id1, id2] = ["client 1", "client 2"]

    aggregator.setNodes(Set.of(id1, id2));

    const result1 = aggregator.getPromiseForAggregation();
    aggregator.add(id1, WeightsContainer.of([0], [1]), 0);
    // Make sure that the aggregation isn't triggered
    expect(aggregator.round).equals(0)
    
    aggregator.registerNode(id2);
    const result2 = aggregator.getPromiseForAggregation();
    aggregator.add(id2, WeightsContainer.of([2], [3]), 0);
    expect((await result1).equals(await result2)).to.be.true
    expect(aggregator.round).equals(1) // round should be one now
  });

  it("can wait for an absolute number of contributions", async () => {
    const aggregator = new MeanAggregator(0, 1, 'absolute');
    const [id1, id2] = ["client 1", "client 2"]
    aggregator.setNodes(Set.of(id1, id2)); // register two clients 

    // should aggregate with only one contribution
    const result = aggregator.getPromiseForAggregation();
    aggregator.add(id1, WeightsContainer.of([0], [1]), 0);
    expect(await WSIntoArrays(await result)).to.deep.equal([[0], [1]]);
  });

  it("can wait for an relative number of contributions", async () => {
    const aggregator = new MeanAggregator(0, 0.5, 'relative');
    const [id1, id2] = ["client 1", "client 2"]
    aggregator.setNodes(Set.of(id1, id2)); // register two clients 

    // should aggregate with only 50% of the contribution (1 contribution)
    const result = aggregator.getPromiseForAggregation();
    aggregator.add(id1, WeightsContainer.of([0], [1]), 0);
    expect(await WSIntoArrays(await result)).to.deep.equal([[0], [1]]);
  });
  
  it("doesn't aggregate when not enough participants", async () => {
    const aggregator = new MeanAggregator(0, 1, 'absolute'); // only wait for a single participant
    aggregator.minNbOfParticipants = 2 // However the task can specify another minimum number, here 2
    const [id1, id2] = ["client 1", "client 2"]
    aggregator.setNodes(Set.of(id1));
    
    const result1 = aggregator.getPromiseForAggregation();
    aggregator.add(id1, WeightsContainer.of([0], [1]), 0);
    // Make sure that the aggregation isn't triggered
    expect(aggregator.round).equals(0)
    
    aggregator.registerNode(id2);
    const result2 = aggregator.getPromiseForAggregation();
    aggregator.add(id2, WeightsContainer.of([2], [3]), 0);
    expect((await result1).equals(await result2)).to.be.true
    expect(aggregator.round).equals(1)
  });
});

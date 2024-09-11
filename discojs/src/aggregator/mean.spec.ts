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
    const aggregator = new MeanAggregator(1, 1, 'relative');
    const [id1, id2, id3] = ["client 1", "client 2", "client 3"]
    aggregator.setNodes(Set.of(id1));

    // round 0
    expect(aggregator.round).to.equal(0)
    expect(aggregator.isValidContribution(id1, 0)).to.be.true;
    const client1Round0Promise = await aggregator.add(id1, WeightsContainer.of([1]));
    expect(WeightsContainer.of([1]).equals(client1Round0Promise)).to.be.true
    expect(aggregator.round).to.equal(1)
    
    // round 1
    aggregator.registerNode(id2);
    expect(aggregator.isValidContribution(id2, 0)).to.be.true; // round 0 should be within the cutoff
    void aggregator.add(id1, WeightsContainer.of([1]));
    const client2Round0Promise = await aggregator.add(id2, WeightsContainer.of([2]));
    expect(WeightsContainer.of([1.5]).equals(client2Round0Promise)).to.be.true
    expect(aggregator.round).to.equal(2)
    
    // round 2
    aggregator.registerNode(id3);
    expect(aggregator.isValidContribution(id3, 0)).to.be.false; // round 0 is now out of the cutoff
    expect(aggregator.isValidContribution(id3, 1)).to.be.true;
    void aggregator.add(id1, WeightsContainer.of([1]));
    void aggregator.add(id2, WeightsContainer.of([1]));
    const client3Round2Promise = await aggregator.add(id3, WeightsContainer.of([4]));
    expect(WeightsContainer.of([2]).equals(client3Round2Promise)).to.be.true
    expect(aggregator.round).to.equal(3)
  });

  it("returns the mean of the weights", async () => {
    const aggregator = new MeanAggregator(0, 2, 'absolute');
    const [id1, id2] = ["client 1", "client 2"]

    aggregator.setNodes(Set.of(id1, id2));

    const results = new Promise<WeightsContainer>((resolve) =>
      aggregator.once("aggregation", resolve),
    );

    const result1 = aggregator.add(id1, WeightsContainer.of([0], [1]));
    const result2 = aggregator.add(id2, WeightsContainer.of([2], [3]));
    expect((await result1).equals(await result2)).to.be.true

    expect(await WSIntoArrays(await results)).to.deep.equal([[1], [2]]);
  });

  it("waits for 100% of the contributions by default", async () => {
    const aggregator = new MeanAggregator();
    const [id1, id2] = ["client 1", "client 2"]

    aggregator.setNodes(Set.of(id1, id2));

    const result1 = aggregator.add(id1, WeightsContainer.of([0], [1]));
    // Make sure that the aggregation isn't triggered by waiting some time
    let timeoutTriggered = false
    await Promise.race([result1,
      new Promise<void>(resolve => setTimeout(() => {
        timeoutTriggered = true
        resolve()
      }, 300))
    ])
    expect(timeoutTriggered).to.be.true
    
    aggregator.registerNode(id2);
    const result2 = aggregator.add(id2, WeightsContainer.of([2], [3]));
    expect((await result1).equals(await result2)).to.be.true
  });

  it("can wait for an absolute number of contributions", async () => {
    const aggregator = new MeanAggregator(0, 1, 'absolute');
    const [id1, id2] = ["client 1", "client 2"]
    aggregator.setNodes(Set.of(id1, id2)); // register two clients 

    // should aggregate with only one contribution
    const result = await aggregator.add(id1, WeightsContainer.of([0], [1]));
    expect(await WSIntoArrays(result)).to.deep.equal([[0], [1]]);
  });

  it("can wait for an relative number of contributions", async () => {
    const aggregator = new MeanAggregator(0, 0.5, 'relative');
    const [id1, id2] = ["client 1", "client 2"]
    aggregator.setNodes(Set.of(id1, id2)); // register two clients 

    // should aggregate with only 50% of the contribution (1 contribution)
    const result = await aggregator.add(id1, WeightsContainer.of([0], [1]));
    expect(await WSIntoArrays(result)).to.deep.equal([[0], [1]]);
  });
  
  it("doesn't aggregate when not enough participants", async () => {
    const aggregator = new MeanAggregator(0, 1, 'absolute'); // only wait for a single participant
    aggregator.minNbOfParticipants = 2 // However the task can specify another minimum number, here 2
    const [id1, id2] = ["client 1", "client 2"]
    aggregator.setNodes(Set.of(id1));
    
    const result1 = aggregator.add(id1, WeightsContainer.of([0], [1]));
    // Make sure that the aggregation isn't triggered by waiting some time
    let timeoutTriggered = false
    await Promise.race([result1,
      new Promise<void>(resolve => setTimeout(() => {
        timeoutTriggered = true
        resolve()
      }, 300))
    ])
    expect(timeoutTriggered).to.be.true
    
    aggregator.registerNode(id2);
    const result2 = aggregator.add(id2, WeightsContainer.of([2], [3]));
    expect((await result1).equals(await result2)).to.be.true
  });
});

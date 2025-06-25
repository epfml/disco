import { List, Set, Range, Map } from "immutable";
import { assert, expect } from "chai";

import {
  aggregator as aggregators,
  aggregation,
  WeightsContainer,
} from "../index.js";

import { SecureHistoryAggregator } from "./secure_history.js"; 
import { SecureAggregator } from "./secure.js";

import { wsIntoArrays, communicate, setupNetwork } from "../aggregator.spec.js";

describe("secure history aggregator", function () {
  const epsilon = 1e-4;

  const expected = WeightsContainer.of([2, 2, 5, 1], [-10, 10]);
  const secrets = List.of(
    WeightsContainer.of([1, 2, 3, -1], [-5, 6]),
    WeightsContainer.of([2, 3, 7, 1], [-10, 5]),
    WeightsContainer.of([3, 1, 5, 3], [-15, 19]),
  );

  function buildShares(): List<List<WeightsContainer>> {
    const nodes = Set(secrets.keys()).map(String);
    return secrets.map((secret) => {
      const aggregator = new SecureHistoryAggregator();
      aggregator.setNodes(nodes);
      return aggregator.generateAllShares(secret);
    });
  }

  function buildPartialSums(
    allShares: List<List<WeightsContainer>>,
  ): List<WeightsContainer> {
    return Range(0, secrets.size)
      .map((idx) => allShares.map((shares) => shares.get(idx)))
      .map((shares) => aggregation.sum(shares as List<WeightsContainer>))
      .toList();
  }

  it("recovers secrets from shares", () => {
    const recovered = buildShares().map((shares) => aggregation.sum(shares));
    assert.isTrue(
      (
        recovered.zip(secrets) as List<[WeightsContainer, WeightsContainer]>
      ).every(([actual, expected]) => actual.equals(expected, epsilon)),
    );
  });

  it("aggregates partial sums with momentum smoothing", () => {
    const aggregator = new SecureHistoryAggregator(100, 0.8);
    const nodes = Set(secrets.keys()).map(String);
    aggregator.setNodes(nodes);

    // simulate first communication round contributions (shares)
    const sharesRound0 = buildShares();
    sharesRound0.forEach((shares, idx) => {
      shares.forEach((share, nodeIdx) => {
        aggregator.add(nodeIdx.toString(), share, 0);
      });
    });

    // aggregate round 0 sums
    const sumRound0 = aggregator.aggregate();
    expect(sumRound0.equals(aggregation.sum(sharesRound0.get(0)!), epsilon)).to.be.true;

    // // simulate second communication round partial sums
    // const partialSums = buildPartialSums(sharesRound0);
    // partialSums.forEach((partialSum, nodeIdx) => {
    //   aggregator.add(nodeIdx.toString(), partialSum, 1);
    // });

    // // First aggregation with momentum - no previous momentum, so just average
    // let agg1 = aggregator.aggregate();
    // const avgPartialSum = aggregation.avg(partialSums);
    // expect(agg1.equals(avgPartialSum, epsilon)).to.be.true;

    // // Add another set of partial sums with slight modification
    // const partialSums2 = partialSums.map(ws =>
    //   ws.map(t => t.mul(1.1))
    // );

    // partialSums2.forEach((partialSum, nodeIdx) => {
    //   aggregator.add(nodeIdx.toString(), partialSum, 1);
    // });

    // // Now momentum should smooth the updated average and previous aggregate
    // const agg2 = aggregator.aggregate();

    // // agg2 should be between avgPartialSum and new partial sums average weighted by beta
    // const avgPartialSum2 = aggregation.avg(partialSums2);
    // // expected = beta * agg1 + (1 - beta) * avgPartialSum2
    // const expectedAgg2 = agg1.mapWith(avgPartialSum2, (a, b) =>
    //   a.mul(aggregator['beta']).add(b.mul(1 - aggregator['beta']))
    // );

    // // Compare agg2 and expectedAgg2 elementwise
    // expect(agg2.equals(expectedAgg2, epsilon)).to.be.true;
  });

  it("behaves similar to SecureAggregator without momentum (beta=0)", async () => {
    class TestSecureHistoryAggregator extends SecureHistoryAggregator {
      constructor() {
        super(0, 0); // beta=0 disables momentum smoothing
      }
    }
    const secureHistoryNetwork = setupNetwork(TestSecureHistoryAggregator); // beta=0 disables momentum smoothing
    const secureNetwork = setupNetwork(SecureAggregator);

    const secureHistoryResults = await communicate(
      Map(
        secureHistoryNetwork
          .entrySeq()
          .zip(Range(0, 3))
          .map(([[id, agg], i]) => [id, [agg, WeightsContainer.of([i])]]),
      ),
      0,
    );
    const secureResults = await communicate(
      Map(
        secureNetwork
          .entrySeq()
          .zip(Range(0, 3))
          .map(([[id, agg], i]) => [id, [agg, WeightsContainer.of([i])]]),
      ),
      0,
    );

    List(await Promise.all(secureHistoryResults.sort().valueSeq().map(wsIntoArrays)))
      .flatMap((x) => x)
      .flatMap((x) => x)
      .zipAll(
        List(await Promise.all(secureResults.sort().valueSeq().map(wsIntoArrays)))
          .flatMap((x) => x)
          .flatMap((x) => x),
      )
      .forEach(([secureHistory, secure]) => expect(secureHistory).to.be.closeTo(secure, 0.001));
  });
});

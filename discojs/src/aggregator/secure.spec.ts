import { List, Set, Range, Map } from "immutable";
import { assert, expect } from "chai";

import {
  aggregator as aggregators,
  aggregation,
  WeightsContainer,
} from "../index.js";

import { MeanAggregator } from "./mean.js";
import { SecureAggregator } from "./secure.js";

import { wsIntoArrays, communicate, setupNetwork } from "../aggregator.spec.js";

describe("secret shares test", function () {
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
      const aggregator = new aggregators.SecureAggregator();
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

  it("recover secrets from shares", () => {
    const recovered = buildShares().map((shares) => aggregation.sum(shares));
    assert.isTrue(
      (
        recovered.zip(secrets) as List<[WeightsContainer, WeightsContainer]>
      ).every(([actual, expected]) => actual.equals(expected, epsilon)),
    );
  });

  it("derive aggregation result from partial sums", () => {
    const actual = aggregation.avg(buildPartialSums(buildShares()));
    assert.isTrue(actual.equals(expected, epsilon));
  });
});

describe("secure aggregator", () => {
  it("behaves as mean aggregator", async () => {
    const secureNetwork = setupNetwork(SecureAggregator)
    const meanNetwork = setupNetwork(MeanAggregator)  // waits for 100% of the nodes' contributions by default

    const meanResults = await communicate(
      Map(
        meanNetwork
          .entrySeq()
          .zip(Range(0, 3))
          .map(([[id, agg], i]) => [id, [agg, WeightsContainer.of([i])]]),
      ), 0
    );
    const secureResults = await communicate(
      Map(
        secureNetwork
          .entrySeq()
          .zip(Range(0, 3))
          .map(([[id, agg], i]) => [id, [agg, WeightsContainer.of([i])]]),
      ), 0
    );

    List(await Promise.all(secureResults.sort().valueSeq().map(wsIntoArrays)))
      .flatMap((x) => x) // .flatten convert to Collection instead of List and zipAll is picky
      .flatMap((x) => x)
      .zipAll(
        List(await Promise.all(meanResults.sort().valueSeq().map(wsIntoArrays)))
          .flatMap((x) => x)
          .flatMap((x) => x),
      )
      .forEach(([secure, mean]) => expect(secure).to.be.closeTo(mean, 0.001));
  });
});

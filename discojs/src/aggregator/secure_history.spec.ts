import { List, Set, Range, Map } from "immutable";
import { assert, expect } from "chai";
import * as tf from "@tensorflow/tfjs";

import {
    aggregator as aggregators,
    aggregation,
    WeightsContainer,
} from "../index.js";

import { SecureHistoryAggregator } from "./secure_history.js";
import { SecureAggregator } from "./secure.js";

import { wsIntoArrays, communicate, setupNetwork } from "../aggregator.spec.js";

describe("Secure history aggregator", function () {
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

    it("aggregates partial sums with momentum smoothing", async () => {
        const aggregator = new SecureHistoryAggregator(100, 0.8);
        const nodes = Set(secrets.keys()).map(String);
        aggregator.setNodes(nodes);

        // Prepare to capture aggregation result
        const aggregationPromise = aggregator.getPromiseForAggregation();

        const sharesRound0 = buildShares();

        let partialSums = Range(0, nodes.size).map((receiverIdx) => {
            const receivedShares = sharesRound0.map(shares => shares.get(receiverIdx)!);
            return aggregation.sum(receivedShares as List<WeightsContainer>);
        }).toList();

        // Add one total contribution per node
        partialSums.forEach((partialSum, idx) => {
            const nodeId = idx.toString();
            aggregator.add(nodeId, partialSum, 0);
        });

        const sumRound0 = await aggregationPromise;

        const expectedSum = aggregation.sum(
            sharesRound0.flatMap(x => x) // flatten to List<WeightsContainer>
        );
        expect(sumRound0.equals(expectedSum, epsilon)).to.be.true;


        // simulate second communication round partial sums
        const aggregationPromise2 = aggregator.getPromiseForAggregation();

        partialSums.forEach((partialSum, idx) => {
            const nodeId = idx.toString();
            aggregator.add(nodeId, partialSum, 0);
        });
        const sumRound1 = await aggregationPromise2;

        // First aggregation with momentum - no previous momentum, so just average
        const avgPartialSum = aggregation.avg(partialSums);
        expect(sumRound1.equals(avgPartialSum, epsilon)).to.be.true;

        const dummyPromise = aggregator.getPromiseForAggregation();
        partialSums.forEach((partialSum, idx) => {
            const nodeId = idx.toString();
            aggregator.add(nodeId, partialSum, 1); // round 0 of next aggregation round
        });
        await dummyPromise;

        const aggregationPromise3 = aggregator.getPromiseForAggregation();
        // Add another set of partial sums with slight modification
        const partialSums2 = partialSums.map(ws =>
            ws.map((tensor) => tf.mul(tensor, 1.1))
        );

        // Step 3: Add new partial sums to aggregator
        partialSums2.forEach((partialSum, idx) => {
            const nodeId = idx.toString();
            aggregator.add(nodeId, partialSum, 1);
        });
        const sumRound2 = await aggregationPromise3;

        const avgPartialSum2 = aggregation.avg(partialSums2);
        const expectedSumRound2 = avgPartialSum.mapWith(avgPartialSum2, (prev, curr) =>
            prev.mul(0.8).add(curr.mul(0.2)) // 0.8 = beta, 0.2 = (1 - beta)
        );

        // Compare the actual result to the expected smoothed result
        expect(sumRound2.equals(expectedSumRound2, 1e-3)).to.be.true;
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

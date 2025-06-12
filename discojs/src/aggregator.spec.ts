import { List, Map, Range, Set } from "immutable";
import { describe, expect, it } from "vitest";
import {
  type Aggregator,
  MeanAggregator,
  SecureAggregator,
} from "./aggregator/index.js";
import type { NodeID } from "./client/types.js";
import { WeightsContainer } from "./index.js";

const AGGREGATORS: Set<[name: string, new () => Aggregator]> = Set.of<
  new () => Aggregator
>(MeanAggregator, SecureAggregator).map((Aggregator) => [
  // MeanAggregator waits for 100% of the node's contributions by default
  Aggregator.name,
  Aggregator,
]);

for (const [name, Aggregator] of AGGREGATORS) {
  describe(`${name} implements Aggregator contract`, () => {
    it("starts at round zero", () => {
      const aggregator = new Aggregator();

      expect(aggregator.round).to.equal(0);
    });

    it("moves forward with enough contributions", async () => {
      const aggregator = new Aggregator();
      aggregator.setNodes(Set.of("client 0", "client 1", "client 2"));

      const results = new Promise((resolve) =>
        aggregator.on("aggregation", resolve),
      );
      
      let promises = List<Promise<WeightsContainer>>()
      for (let i = 0; i < 3; i++)
        for (let r = 0; r < aggregator.communicationRounds; r++){
          promises = promises.push(aggregator.getPromiseForAggregation())
          aggregator.add(`client ${i}`, WeightsContainer.of([i]), 0, r)
        }
      await Promise.all(promises)
      await results; // nothing to test

      expect(aggregator.round).to.equal(1);
    });

    it("gives same results on each node", async () => {
      const network = setupNetwork(Aggregator);

      const results = Set(
        await Promise.all(
          (
            await communicate(
              Map(
                network
                  .entrySeq()
                  .zip(Range(1312, Number.POSITIVE_INFINITY))
                  .map(([[id, agg], ws]) => [
                    id,
                    [agg, WeightsContainer.of([ws])],
                  ]),
              ), 0
            )
          )
            .valueSeq()
            .map(wsIntoArrays)
            .toArray(),
        ),
      );

      results.reduce((first, cur) => {
        expect(cur).to.be.deep.equal(first);
        return first;
      });
    });
  })
}

export async function wsIntoArrays(ws: WeightsContainer): Promise<number[][]> {
  return (await Promise.all(ws.weights.map(async (w) => await w.data()))).map(
    (arr) => [...arr],
  );
}

export function setupNetwork<A extends Aggregator>(
  Aggregator: new () => A,
): Map<NodeID, A> {
  const ret = Map(
    Range(0, 3).map((i) => [`client ${i}`, new Aggregator()] as [NodeID, A]),
  );
	for (const secure of ret.values()) secure.setNodes(ret.keySeq().toSet());

  return ret;
}

// run all rounds of communication
export async function communicate<A extends Aggregator>(
  networkWithContributions: Map<NodeID, [A, WeightsContainer]>,
  aggregationRound: number
): Promise<Map<NodeID, WeightsContainer>> {
  const communicationsRound =
    networkWithContributions.first()?.[0].communicationRounds;
  if (communicationsRound === undefined) throw new Error("empty network");

  const network = networkWithContributions.map(([agg, _]) => agg);
  let contributions = networkWithContributions.map(
    ([_, contribution]) => contribution,
  );

  for (let r = 0; r < communicationsRound; r++) {
    const nextContributions = network
      .entrySeq()
      .map<Promise<[NodeID, WeightsContainer]>>(async ([id, agg]) => [
        id,
        await new Promise((resolve) => agg.on("aggregation", resolve)),
      ])
      .toArray();

		for (const [id, agg] of network) {
			const contribution = contributions.get(id);
			if (contribution === undefined)
				throw new Error(`no contribution for ${id}`);

			for (const [to, payload] of agg.makePayloads(contribution))
				network.get(to)?.add(id, payload, aggregationRound, r);
		}

    contributions = Map(await Promise.all(nextContributions));
  }

  return contributions;
}

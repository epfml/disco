import { Set } from "immutable";
import { describe, expect, it } from "vitest";

import type { Task } from "#task/index";
import { defaultTasks } from "#root/index";
import { WeightsContainer } from "#weights/index";
import { MeanAggregator } from "#aggregator/mean";
import { ByzantineRobustAggregator } from "#aggregator/byzantine";
import { getFederatedServerAggregator } from "#aggregator/get";

async function getByzantineTask(): Promise<Task<"tabular", "federated">> {
  const task = await defaultTasks.titanic.getTask();
  return {
    ...task,
    trainingInformation: {
      ...task.trainingInformation,
      aggregationStrategy: "byzantine",
      privacy: {
        byzantineFaultTolerance: {
          clippingRadius: 2,
          maxIterations: 1,
          beta: 0.9,
        },
      },
    },
  };
}

describe("federated server aggregator", () => {
  it("builds a mean aggregator from the task", async () => {
    const task = await defaultTasks.titanic.getTask();
    const aggregator = getFederatedServerAggregator(task);
    expect(aggregator).to.be.instanceOf(MeanAggregator);
  });

  it("builds a byzantine aggregator from the task", async () => {
    const aggregator = getFederatedServerAggregator(await getByzantineTask());
    expect(aggregator).to.be.instanceOf(ByzantineRobustAggregator);
  });

  it("waits for every node's contribution by default", async () => {
    const task = await defaultTasks.titanic.getTask();
    const aggregator = getFederatedServerAggregator(task);
    aggregator.setNodes(Set.of("client 1", "client 2"));

    const aggregated = aggregator.getPromiseForAggregation();
    aggregator.add("client 1", WeightsContainer.of([1]), 0);
    expect(aggregator.round).to.equal(0);
    aggregator.add("client 2", WeightsContainer.of([3]), 0);

    expect(await WeightsContainer.of([2]).equals(await aggregated)).to.be.true;
    expect(aggregator.round).to.equal(1);
  });

  it("allows overriding the default parameters", async () => {
    const task = await defaultTasks.titanic.getTask();
    const aggregator = getFederatedServerAggregator(task, {
      threshold: 1,
      thresholdType: "absolute",
    });
    aggregator.setNodes(Set.of("client 1", "client 2"));

    const aggregated = aggregator.getPromiseForAggregation();
    aggregator.add("client 1", WeightsContainer.of([1]), 0);

    expect(await WeightsContainer.of([1]).equals(await aggregated)).to.be.true;
    expect(aggregator.round).to.equal(1);
  });
});

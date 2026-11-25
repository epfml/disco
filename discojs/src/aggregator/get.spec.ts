import { Set } from "immutable";
import { describe, expect, it } from "vitest";

import type { Task } from "#task/index";
import { aggregationConfigSchema, parseAggregationConfig } from "#task/index";
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
      aggregationParams: {
        clippingRadius: 2,
        maxIterations: 1,
        beta: 0.9,
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

  it("builds a byzantine aggregator with custom aggregationParams", async () => {
    const task = await defaultTasks.titanic.getTask();
    const taskWithStrategy: Task<"tabular", "federated"> = {
      ...task,
      trainingInformation: {
        ...task.trainingInformation,
        aggregationStrategy: "byzantine",
        aggregationParams: { clippingRadius: 2.5, maxIterations: 3, beta: 0.8 },
      },
    };
    const aggregator = getFederatedServerAggregator(taskWithStrategy);
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

describe("aggregation config parsing", () => {
  it("resolves defaults for byzantine and secure", () => {
    expect(
      aggregationConfigSchema.parse({
        aggregationStrategy: "byzantine",
      }),
    ).to.deep.equal({
      aggregationStrategy: "byzantine",
      aggregationParams: { clippingRadius: 1.0, maxIterations: 1, beta: 0.9 },
    });

    expect(
      aggregationConfigSchema.parse({
        aggregationStrategy: "secure",
      }),
    ).to.deep.equal({
      aggregationStrategy: "secure",
      aggregationParams: { maxShareValue: 100 },
    });

    expect(
      parseAggregationConfig({
        aggregationStrategy: "mean",
        aggregationParams: undefined,
      }),
    ).to.deep.equal({
      aggregationStrategy: "mean",
      aggregationParams: undefined,
    });
  });

  it("rejects unknown or misspelled keys and params on mean", () => {
    expect(() =>
      aggregationConfigSchema.parse({
        aggregationStrategy: "byzantine",
        aggregationParams: { clipingRadius: 2.0 },
      }),
    ).to.throw();

    expect(() =>
      aggregationConfigSchema.parse({
        aggregationStrategy: "mean",
        aggregationParams: { clippingRadius: 1.0 },
      }),
    ).to.throw();
  });
});

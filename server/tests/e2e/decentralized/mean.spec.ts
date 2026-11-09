import { defaultModels, defaultTasks } from "@epfml/discojs";
import { describe, it } from "vitest";
import {
  reachDecentralizedConsensus,
  runTenCifar10Consensus,
  startServer,
} from "../helpers.js";

describe("end-to-end decentralized mean", { timeout: 50_000 }, () => {
  it("single round of cifar 10 with three mean aggregators yields consensus", async () => {
    const url = await startServer(
      defaultModels.CIFAR10Classifier,
      defaultTasks.cifar10,
    );
    await reachDecentralizedConsensus(url, "mean");
  });

  it("several rounds of cifar 10 with three mean aggregators yields consensus", async () => {
    const url = await startServer(
      defaultModels.CIFAR10Classifier,
      defaultTasks.cifar10,
    );
    await reachDecentralizedConsensus(url, "mean", 3);
  });

  /**
   * Unit tests with 10 participants
   */
  it(
    "ten cifar10 users reach consensus with mean aggregation",
    { timeout: 300_000 },
    async () => {
      await runTenCifar10Consensus({
        aggregationStrategy: "mean",
        epochs: 3,
      });
    },
  );
});

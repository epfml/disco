import { defaultModels, defaultTasks } from "@epfml/discojs";
import { describe, it } from "vitest";
import {
  reachDecentralizedConsensus,
  runTenCifar10Consensus,
  startServer,
} from "../helpers.js";

describe("end-to-end decentralized secure", { timeout: 50_000 }, () => {
  it("single round of cifar 10 with three secure aggregators yields consensus", async () => {
    const url = await startServer(
      defaultModels.CIFAR10Classifier,
      defaultTasks.cifar10,
    );
    await reachDecentralizedConsensus(url, "secure");
  });

  it("several rounds of cifar 10 with three secure aggregators yields consensus", async () => {
    const url = await startServer(
      defaultModels.CIFAR10Classifier,
      defaultTasks.cifar10,
    );
    await reachDecentralizedConsensus(url, "secure", 3);
  });

  it(
    "ten cifar10 users reach consensus with secure aggregation",
    { timeout: 500_000 },
    async () => {
      await runTenCifar10Consensus({
        aggregationStrategy: "secure",
        epochs: 10,
        maxShareValue: 100,
      });
    },
  );
});

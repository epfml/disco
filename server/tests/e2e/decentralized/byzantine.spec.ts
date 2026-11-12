import { describe, it } from "vitest";
import { runTenCifar10Consensus } from "../helpers.js";

describe("end-to-end decentralized byzantine", { timeout: 50_000 }, () => {
  it(
    "ten cifar10 users reach consensus with byzantine aggregation",
    { timeout: 300_000 },
    async () => {
      await runTenCifar10Consensus({
        aggregationStrategy: "byzantine",
        aggregationParams: {
          clippingRadius: 10,
          maxIterations: 1,
          beta: 0.9,
        },
        epochs: 3,
      });
    },
  );
});

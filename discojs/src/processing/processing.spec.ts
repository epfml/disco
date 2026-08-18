import { describe, expect, it } from "vitest";

import { preprocess } from "#processing/processing";

import type { Task } from "#task/index";
import { Dataset } from "#dataset/index";

describe("preprocess", () => {
  it("throws on missing column in tabular", async () => {
    const task: Task<"tabular", "local"> = {
      id: "task",
      dataType: "tabular",
      displayInformation: {
        title: "",
        summary: { preview: "", overview: "" },
      },
      trainingInformation: {
        tensorBackend: "tfjs",
        scheme: "local",
        aggregationStrategy: "mean",
        epochs: 1,
        roundDuration: 1,
        batchSize: 1,
        validationSplit: 0,
        inputColumns: ["a", "b"],
        outputColumn: "c",
      },
    };

    const dataset = new Dataset([
      { a: "1", b: "2", c: "3" },
      { a: "4", b: "5" },
    ]);

    try {
      const preprocessed = preprocess(task, dataset);
      for await (const _ of preprocessed);
    } catch {
      return;
    }

    expect(false, "should have thrown").to.be.true;
  });
});

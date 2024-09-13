import { expect } from "chai";

import { Dataset, Task } from "../index.js";

import { preprocess } from "./index.js";

describe("preprocess", () => {
  it("throws on missing column in tabular", async () => {
    const task: Task<"tabular"> = {
      id: "task",
      displayInformation: {
        taskTitle: "",
        summary: { preview: "", overview: "" },
      },
      trainingInformation: {
        dataType: "tabular",
        tensorBackend: "tfjs",
        scheme: "local",
        minNbOfParticipants: 1,
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
      const preprocessed = await preprocess(task, dataset);
      for await (const _ of preprocessed);
    } catch {
      return;
    }

    expect(false, "should have thrown").to.be.true;
  });
});

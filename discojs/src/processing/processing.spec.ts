import { describe, expect, it } from "vitest";

import { preprocess } from "#processing/processing";

import type { Task } from "#task/index";
import { Dataset } from "#dataset/index";

async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}

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

  it("drops incomplete text windows", async () => {
    const task = {
      id: "task",
      dataType: "text",
      displayInformation: {
        title: "",
        summary: { preview: "", overview: "" },
      },
      trainingInformation: {
        tensorBackend: "gpt",
        scheme: "local",
        aggregationStrategy: "mean",
        epochs: 1,
        roundDuration: 1,
        batchSize: 2,
        validationSplit: 0,
        contextLength: 4,
        tokenizer: {
          tokenize: () => [0, 1, 2, 3, 4, 5, 6],
        },
      },
    } as unknown as Task<"text", "local">;

    const dataset = new Dataset(["ignored"]);
    const preprocessed = await arrayFromAsync(preprocess(task, dataset));

    expect(preprocessed.map(([tokens]) => tokens.size)).to.deep.equal([4]);
  });
});

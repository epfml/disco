import { Set } from "immutable";
import { describe, expect, it } from "vitest";

import { Dataset } from "@epfml/discojs";

import * as validate from "../validate";

describe("tabular validation", () => {
  const columns = Set(["a", "b"]);

  it("accepts complete rows", async () => {
    await expect(
      validate.tabular(columns, new Dataset([{ a: "1", b: "x" }])),
    ).resolves.toBeUndefined();
  });

  it("rejects empty files", async () => {
    await expect(validate.tabular(columns, new Dataset([]))).rejects.toThrow(
      /doesn't contain any row/,
    );
  });

  it("rejects missing columns", async () => {
    await expect(
      validate.tabular(columns, new Dataset([{ a: "1" }])),
    ).rejects.toThrow(/row 1 is missing columns b/);
  });

  it("rejects missing values", async () => {
    await expect(
      validate.tabular(
        columns,
        new Dataset([
          { a: "1", b: "x" },
          { a: "", b: "y" },
        ]),
      ),
    ).rejects.toThrow(/row 2 column "a" is missing a value/);
  });
});

import { describe, expect, it } from "vitest";

import { Dataset } from "#dataset/index";

import {
  computeStandardizationStats,
  encodeTabularRow,
  isMissingValue,
} from "#processing/tabular";

describe("isMissingValue", () => {
  it("considers absent, blank and NaN cells as missing", () => {
    for (const raw of [undefined, "", "  ", "NaN", "nan", " NAN "])
      expect(isMissingValue(raw), `${raw}`).to.be.true;
  });

  it("considers other cells as present", () => {
    for (const raw of ["0", "1.5", "male", "Missing"])
      expect(isMissingValue(raw), raw).to.be.false;
  });
});

describe("computeStandardizationStats", () => {
  it("computes mean and std of each column", async () => {
    const stats = await computeStandardizationStats(
      new Dataset([
        { a: "1", b: "5" },
        { a: "3", b: "5" },
      ]),
      ["a", "b"],
    );

    expect(stats).to.deep.equal({
      means: { a: 2, b: 5 },
      stds: { a: 1, b: 0 },
    });
  });

  it("throws on missing value", async () => {
    await expect(
      computeStandardizationStats(new Dataset([{ a: "1" }, { a: "" }]), ["a"]),
    ).rejects.toThrow(/missing value in column "a"/);
  });
});

describe("encodeTabularRow", () => {
  const categoricalColumns = { sex: ["male", "female"] };
  const stats = { means: { age: 30 }, stds: { age: 10 } };

  it("standardizes numerical and one-hot encodes categorical columns", () => {
    expect(
      encodeTabularRow(
        { age: "40", sex: "female" },
        ["age", "sex"],
        categoricalColumns,
        stats,
      ),
    ).to.deep.equal([1, 0, 1]);
  });

  it("throws on missing numerical value", () => {
    expect(() =>
      encodeTabularRow(
        { age: "", sex: "male" },
        ["age", "sex"],
        categoricalColumns,
        stats,
      ),
    ).to.throw(/missing value in column "age"/);
  });

  it("throws on missing categorical value", () => {
    expect(() =>
      encodeTabularRow(
        { age: "40", sex: "NaN" },
        ["age", "sex"],
        categoricalColumns,
        stats,
      ),
    ).to.throw(/missing value in column "sex"/);
  });
});

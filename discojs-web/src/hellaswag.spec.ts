import { describe, it, expect } from "vitest";
import { load as loadHellaSwag } from "./hellaswag.js";
import type { models } from "@epfml/discojs";

describe("hellaswag parser", () => {
  it("loads the whole hellaswag dataset", async () => {
    const dataset: models.HellaSwagDataset = await loadHellaSwag(2);

    // basic assertions
    expect(dataset).to.be.an("array");
    expect(dataset.length).to.equal(2);

    // check structure of the first example
    const first = dataset[0];
    expect(first).to.have.property("ctx").that.is.a("string");
    expect(first)
      .to.have.property("endings")
      .that.is.an("array")
      .with.lengthOf(4);
    expect(first).to.have.property("label").that.is.a("number");
  });
});

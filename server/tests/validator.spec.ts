import { expect } from "chai";
import { Repeat } from "immutable";

import { Validator, defaultTasks } from "@epfml/discojs";
import { loadCSV, loadImagesInDir } from "@epfml/discojs-node";

describe("validator", () => {
  it("can read and predict randomly on simple_face", async () => {
    const provider = defaultTasks.simpleFace;

    const [adult, child] = [
      (await loadImagesInDir("../datasets/simple_face/adult")).zip(
        Repeat("adult"),
      ),
      (await loadImagesInDir("../datasets/simple_face/child")).zip(
        Repeat("child"),
      ),
    ];
    const dataset = adult.chain(child);

    const validator = new Validator(
      provider.getTask(),
      await provider.getModel(),
    );

    let hits = 0;
    let size = 0;
    for await (const correct of validator.test(["image", dataset])) {
      if (correct) hits++;
      size++;
    }

    expect(hits / size).to.be.greaterThan(0.3);
  }).timeout("5s");

  it("can read and predict randomly on titanic", async () => {
    const provider = defaultTasks.titanic;

    const dataset = loadCSV("../datasets/titanic_train.csv");

    const validator = new Validator(
      provider.getTask(),
      await provider.getModel(),
    );

    let hits = 0;
    let size = 0;
    for await (const correct of validator.test(["tabular", dataset])) {
      if (correct) hits++;
      size++;
    }

    expect(hits / size).to.be.greaterThan(0.3);
  });

  it("can read and predict randomly on lus_covid", async () => {
    const provider = defaultTasks.lusCovid;

    const [positive, negative] = [
      (await loadImagesInDir("../datasets/lus_covid/COVID+")).zip(
        Repeat("COVID-Positive"),
      ),
      (await loadImagesInDir("../datasets/lus_covid/COVID-")).zip(
        Repeat("COVID-Negative"),
      ),
    ];
    const dataset = positive.chain(negative);

    const validator = new Validator(
      provider.getTask(),
      await provider.getModel(),
    );

    let hits = 0;
    let size = 0;
    for await (const correct of validator.test(["image", dataset])) {
      if (correct) hits++;
      size++;
    }

    expect(hits / size).to.be.greaterThan(0.3);
  });
});

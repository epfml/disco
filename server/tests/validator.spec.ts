import { expect } from "chai";
import { Repeat } from "immutable";

import { Validator, defaultTasks } from "@epfml/discojs";
import { loadCSV, loadImagesInDir } from "@epfml/discojs-node";
import { setupLusCOVID } from "./utils.js";

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
    for await (const correct of await validator.test(dataset)) {
      if (correct) hits++;
      size++;
    }

    expect(hits / size).to.be.greaterThan(0.3);
  }).timeout("10s");

  it("can read and predict randomly on titanic", async () => {
    const provider = defaultTasks.titanic;

    const dataset = loadCSV("../datasets/titanic_train.csv");

    const validator = new Validator(
      provider.getTask(),
      await provider.getModel(),
    );

    let hits = 0;
    let size = 0;
    for await (const correct of await validator.test(dataset)) {
      if (correct) hits++;
      size++;
    }

    expect(hits / size).to.be.greaterThan(0.3);
  });

  it("can read and predict randomly on lus_covid", async () => {
    const provider = defaultTasks.lusCovid;
    const { dataset, lusCovidTask } = await setupLusCOVID("federated");

    const validator = new Validator(
      lusCovidTask,
      await provider.getModel(),
    );

    let hits = 0;
    let size = 0;
    for await (const correct of await validator.test(dataset)) {
      if (correct) hits++;
      size++;
    }

    expect(hits / size).to.be.greaterThan(0.3);
  }).timeout("10s");
});

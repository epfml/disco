import { Validator, defaultTasks } from "@epfml/discojs";
import { describe, expect, it } from "vitest";
import { datasets } from "./utils.js";

describe("validator", () => {
  it(
    "can read and predict randomly on simple_face",
    { timeout: 20_000 },
    async () => {
      const provider = defaultTasks.simpleFace;
      const dataset = await datasets.loadSimpleFace();

      const validator = new Validator(
        await provider.getTask(),
        await provider.getModel(),
      );

      let hits = 0;
      let size = 0;
      for await (const correct of validator.test(dataset)) {
        if (correct) hits++;
        size++;
      }

      expect(hits / size).to.be.greaterThan(0.3);
    },
  );

  it(
    "can read and predict randomly on titanic",
    { timeout: 10_000 },
    async () => {
      const provider = defaultTasks.titanic;
      const dataset = datasets.loadTitanic();

      const validator = new Validator(
        await provider.getTask(),
        await provider.getModel(),
      );

      let hits = 0;
      let size = 0;
      for await (const correct of validator.test(dataset)) {
        if (correct) hits++;
        size++;
      }

      expect(hits / size).to.be.greaterThan(0.3);
    },
  );

  it(
    "can read and predict randomly on lus_covid",
    { timeout: 50_000 },
    async () => {
      const task = await defaultTasks.lusCovid.getTask();
      task.trainingInformation = {
        ...task.trainingInformation,
        roundDuration: 2,
        minNbOfParticipants: 2,
      };
      const dataset = await datasets.loadLusCOVID();

      const validator = new Validator(
        task,
        await defaultTasks.lusCovid.getModel(),
      );

      let hits = 0;
      let size = 0;
      for await (const correct of validator.test(dataset)) {
        if (correct) hits++;
        size++;
      }

      expect(hits / size).to.be.greaterThan(0.3);
    },
  );
});

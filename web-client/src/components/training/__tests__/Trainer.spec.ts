import { expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import * as fs from "node:fs/promises";
import * as tf from "@tensorflow/tfjs";

import type { TaskProvider } from "@epfml/discojs-core";
import { data, models, serialization } from "@epfml/discojs-core";
import { WebTabularLoader } from "@epfml/discojs";

import Trainer from "../Trainer.vue";
import TrainingInformation from "../TrainingInformation.vue";

const TASK: TaskProvider = {
  getTask: () => {
    return {
      id: "simple",
      displayInformation: {},
      trainingInformation: {},
    };
  },
  getModel: () => {
    const model = tf.sequential({
      layers: [tf.layers.dense({ units: 1, inputShape: [1] })],
    });

    model.compile({ loss: "meanSquaredError", optimizer: "sgd" });

    return Promise.resolve(new models.TFJS(model));
  },
};

vi.mock("axios", async () => {
  async function get(url: string) {
    if (url === "http://localhost:8080/tasks/titanic/model.json") {
      return {
        data: await TASK.getModel().then(serialization.model.encode),
      };
    }
    throw new Error("unhandled get");
  }

  const axios = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...axios,
    default: {
      ...axios.default,
      get,
    },
  };
});

async function setupForTask() {
  const task = TASK.getTask()

  const builder = new data.DatasetBuilder(new WebTabularLoader(task), task);
  builder.addFiles([
    new File(
      [await fs.readFile("../datasets/titanic_train.csv")],
      "titanic_train.csv",
    ),
  ]);

  return mount(Trainer, {
    global: {
      mocks: {
        $t: (text: string) => text,
      },
      stubs: {
        apexchart: true,
      },
      plugins: [createTestingPinia({ createSpy: vi.fn })],
    },
    props: {
      task,
      datasetBuilder: builder,
    },
  });
}

it("increases accuracy when training alone", async () => {
  const wrapper = await setupForTask();

  await wrapper.get("button").trigger("click");
  const infos = wrapper.getComponent(TrainingInformation);
  while (infos.props("logs").isEmpty()) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  expect(
    infos.props("logs").last()?.epoches.last()?.training.accuracy,
  ).toBeGreaterThan(0);
});

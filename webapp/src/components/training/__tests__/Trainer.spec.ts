import { expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import * as fs from "node:fs/promises";

import { defaultTasks, serialization } from "@epfml/discojs";
import { parseCSV } from "@epfml/discojs-web";

import Trainer from "../Trainer.vue";
import TrainingInformation from "../TrainingInformation.vue";

vi.mock("axios", async () => {
  async function get(url: string) {
    if (url === "http://localhost:8080/tasks/titanic/model.json") {
      return {
        data: await serialization.model.encode(
          await defaultTasks.titanic.getModel(),
        ),
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
  const task = defaultTasks.titanic.getTask();

  return mount(Trainer, {
    global: {
      stubs: {
        apexchart: true,
      },
      plugins: [createTestingPinia({ createSpy: vi.fn })],
    },
    props: {
      task,
      dataset: [
        "tabular",
        parseCSV(
          new File(
            [await fs.readFile("../datasets/titanic_train.csv")],
            "titanic_train.csv",
          ),
        ),
      ],
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
    infos.props("logs").last()?.epochs.last()?.training.accuracy,
  ).toBeGreaterThan(0);
});

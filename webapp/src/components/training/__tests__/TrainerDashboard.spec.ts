import * as fs from "node:fs/promises";
import { CONFIG } from "@/config";
import { defaultTasks, serialization } from "@epfml/discojs";
import { loadCSV } from "@epfml/discojs-web";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { afterEach, expect, it, vi } from "vitest";
import { directive as Tippy } from "vue-tippy";
import TrainerDashboard from "../TrainerDashboard.vue";
import TrainingInformation from "../TrainingInformation.vue";

async function setupForTask() {
  const provider = defaultTasks.titanic;

  vi.stubGlobal("fetch", async (url: string | URL) => {
    if (
      url.toString() ===
      new URL("tasks/titanic/model.json", CONFIG.serverUrl).href
    ) {
      const model = await provider.getModel();
      const encoded = await serialization.model.encode(model);
      return new Response(encoded);
    }
    throw new Error(`unhandled get: ${url}`);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  return mount(TrainerDashboard, {
    global: {
      directives: { Tippy },
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
    },
    props: {
      task: await provider.getTask(),
      dataset: loadCSV(
        new File(
          [await fs.readFile("../datasets/titanic_train.csv")],
          "titanic_train.csv",
        ),
      ),
    },
  });
}

it("increases accuracy when training alone", { timeout: 20_000 }, async () => {
  const wrapper = await setupForTask();
  await wrapper.get("#train-locally-bttn").trigger("click");
  await wrapper.get("#start-training-bttn").trigger("click");
  const infos = wrapper.getComponent(TrainingInformation);
  while (infos.props("rounds").isEmpty())
    await new Promise((resolve) => setTimeout(resolve, 100));

  expect(
    infos.props("rounds").last()?.epochs.last()?.training.accuracy,
  ).toBeGreaterThan(0);
});

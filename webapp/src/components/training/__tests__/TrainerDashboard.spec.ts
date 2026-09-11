import * as fs from "node:fs/promises";
import { CONFIG } from "@/config";
import { defaultTasks, modelEncode } from "@epfml/discojs";
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
      const model = await provider.modelCard.getModel();
      const encoded = await modelEncode(model);
      return new Response(new Uint8Array(encoded));
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
          [new Uint8Array(await fs.readFile("../datasets/titanic_train.csv"))],
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

it("hides the participants when training alone", async () => {
  const wrapper = await setupForTask();

  expect(wrapper.text()).toContain("number of participants");

  // nobody to collaborate with, the count would be stuck at one
  await wrapper.get("#train-locally-bttn").trigger("click");

  expect(wrapper.text()).not.toContain("number of participants");
});

it(
  "resets the participants when a training starts",
  { timeout: 20_000 },
  async () => {
    const wrapper = await setupForTask();
    const infos = wrapper.getComponent(TrainingInformation);

    // stand for a previous session having left a count behind, which only a
    // connected client can otherwise produce
    (wrapper.vm as unknown as { nbParticipants: number }).nbParticipants = 4;
    await wrapper.vm.$nextTick();
    expect(infos.props("nbParticipants")).to.equal(4);

    // train alone so that the round completes without a server to connect to
    await wrapper.get("#train-locally-bttn").trigger("click");
    await wrapper.get("#start-training-bttn").trigger("click");
    while (infos.props("rounds").isEmpty())
      await new Promise((resolve) => setTimeout(resolve, 100));

    expect(infos.props("nbParticipants")).to.equal(1);
  },
);

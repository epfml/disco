import { Map } from "immutable";

import { storeToRefs } from "pinia";
import { afterEach, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { createPersistedStatePlugin } from "pinia-plugin-persistedstate-2";

import type { Task } from "@epfml/discojs";
import { GPT, serializeTaskToJSON, Tokenizer } from "@epfml/discojs";

import { CONFIG } from "@/config";
import { useModelsStore } from "@/store";
import { useTasksStore } from "@/store";

import ModelLibrary from "../ModelLibrary.vue";
import TestingBar from "@/components/progress_bars/TestingBar.vue";

const TASK: Task<"text", "federated"> = {
  id: "task",
  dataType: "text",
  displayInformation: {
    title: "task title",
    summary: { preview: "", overview: "" },
  },
  trainingInformation: {
    tokenizer: await Tokenizer.from_pretrained("Xenova/gpt2"),
    tensorBackend: "gpt",
    scheme: "federated",
    aggregationStrategy: "mean",
    minNbOfParticipants: 1,
    epochs: 1,
    batchSize: 1,
    roundDuration: 1,
    validationSplit: 0,
    contextLength: 64,
  },
};

it("shows stored language models without classification steps", async () => {
  const wrapper = mount(
    {
      components: { ModelLibrary, TestingBar },
      template: "<TestingBar /><ModelLibrary />",
    },
    {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
            plugins: [createPersistedStatePlugin({ persist: false })],
          }),
        ],
        stubs: ["RouterLink"],
      },
    },
  );

  const { tasks } = storeToRefs(useTasksStore());
  await flushPromises();
  tasks.value = Map([[TASK.id, TASK]]);

  const models = useModelsStore();
  await models.add("task", new GPT());
  await nextTick();

  expect(wrapper.get("div.text-xl").text()).to.equal("task title");
  expect(
    wrapper.findAll("button").some((button) => button.text() === "chat"),
  ).toBe(true);
  expect(wrapper.text()).not.toContain("Connect Your Data");
  expect(wrapper.text()).not.toContain("Evaluate Your Model");
});

it("allows to download server's models", async () => {
  vi.stubGlobal("fetch", (url: string | URL) => {
    if (url.toString() === new URL("tasks", CONFIG.serverUrl).href)
      return new Response(JSON.stringify([serializeTaskToJSON(TASK)]));
    throw new Error(`unhandled get: ${url}`);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const wrapper = mount(ModelLibrary, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          plugins: [createPersistedStatePlugin({ persist: false })],
        }),
      ],
      stubs: ["RouterLink"],
    },
  });

  // load tasks
  const { tasks } = storeToRefs(useTasksStore());
  while (tasks.value === "loading") await flushPromises();

  expect(wrapper.get("button").text()).to.equal("download");
  await wrapper.get("button").trigger("click");
  await flushPromises();

  expect(wrapper.get("div.text-xl").text()).to.equal("task title");
});

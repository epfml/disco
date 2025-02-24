import { Map } from "immutable";

import { storeToRefs } from "pinia";
import { afterEach, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { createPersistedStatePlugin } from "pinia-plugin-persistedstate-2";

import { models as discoModels, serialization, Task, Tokenizer } from "@epfml/discojs";

import { CONFIG } from "@/config";
import { useModelsStore } from "@/store";
import { useTasksStore } from "@/store";

import ModelLibrary from "../ModelLibrary.vue";

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

it("shows stored models", async () => {
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

  const { tasks } = storeToRefs(useTasksStore());
  await flushPromises();
  tasks.value = Map([[TASK.id, TASK]])

  const models = useModelsStore();
  await models.add("task", new discoModels.GPT());
  await nextTick();

  expect(wrapper.get("div.text-xl").text()).to.equal("task title");
});

it("allows to download server's models", async () => {
  vi.stubGlobal("fetch", async (url: string | URL) => {
    if (url.toString() === new URL("tasks", CONFIG.serverUrl).href)
      return new Response(
        JSON.stringify([serialization.task.serializeToJSON(TASK)]),
      );
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

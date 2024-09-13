import { expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import piniaPersited from "pinia-plugin-persistedstate";

import type { Task } from "@epfml/discojs";
import { models as discoModels } from "@epfml/discojs";

import { useModelsStore } from "@/store/models";
import { useTasksStore } from "@/store/tasks";

import Testing from "../Testing.vue";

const TASK: Task = {
  id: "task",
  displayInformation: {
    taskTitle: "task title",
    summary: { preview: "", overview: "" },
  },
  trainingInformation: {
    dataType: "text",
    tokenizer: "Xenova/gpt2",
    tensorBackend: "gpt",
    scheme: "federated",
    minNbOfParticipants: 1,
    epochs: 1,
    batchSize: 1,
    roundDuration: 1,
    validationSplit: 0,
  },
};

it("shows stored models", async () => {
  const wrapper = mount(Testing, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          plugins: [piniaPersited],
        }),
      ],
      stubs: ["RouterLink"],
    },
  });

  const tasks = useTasksStore();
  tasks.status = "success";
  tasks.addTask(TASK);
  await nextTick();

  const models = useModelsStore();
  await models.add("task", new discoModels.GPT());
  await nextTick();

  expect(wrapper.get("div.text-xl").text()).to.equal("task title");
});

it("allows to download server's models", async () => {
  vi.mock("axios", async () => {
    const axios = await vi.importActual<typeof import("axios")>("axios");
    return {
      ...axios,
      default: {
        ...axios.default,
        async get(url: string) {
          if (url === "http://localhost:8080/tasks") return { data: [TASK] };
          throw new Error(`unhandled get: ${url}`);
        },
      },
    };
  });

  const wrapper = mount(Testing, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          plugins: [piniaPersited],
        }),
      ],
      stubs: ["RouterLink"],
    },
  });

  const tasks = useTasksStore();
  await tasks.initTasks();
  await nextTick();

  expect(wrapper.get("button").text()).to.equal("download");
  await wrapper.get("button").trigger("click");
  await flushPromises();

  expect(wrapper.get("div.text-xl").text()).to.equal("task title");
});

import * as fs from "node:fs/promises";
import * as tf from "@tensorflow/tfjs";
import { CONFIG } from "@/config";
import { defaultTasks, modelEncode, type Model } from "@epfml/discojs";
import { loadCSV } from "@epfml/discojs-web";
import { defineWebWorkers } from "@vitest/web-worker/pure";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { afterEach, expect, it, vi } from "vitest";
import { directive as Tippy } from "vue-tippy";
import TrainerDashboard from "../TrainerDashboard.vue";
import TrainingInformation from "../TrainingInformation.vue";
import type { FromWorker, ToWorker } from "../worker_messages";

const workers: HangingWorker[] = [];
class HangingWorker {
  onmessage?: (event: MessageEvent<FromWorker>) => void;
  onerror?: (event: ErrorEvent) => void;
  messages: ToWorker[] = [];
  terminated = false;
  constructor() {
    workers.push(this);
  }
  postMessage(message: ToWorker): void {
    this.messages.push(message);
  }
  terminate(): void {
    this.terminated = true;
  }
}

async function setupForTask(scheme?: "decentralized", realTraining = true) {
  await tf.setBackend("cpu");
  const provider = defaultTasks.titanic;
  if (realTraining) defineWebWorkers({ clone: "native" });
  else vi.stubGlobal("Worker", HangingWorker);
  vi.stubGlobal("fetch", async (url: string | URL) => {
    if (
      url.toString() ===
      new URL("tasks/titanic/model.json", CONFIG.serverUrl).href
    ) {
      const model = await provider.modelCard.getModel();
      const encoded = await modelEncode(model);
      model.dispose();
      return new Response(new Uint8Array(encoded));
    }
    throw new Error(`unhandled get: ${url}`);
  });
  const task = await provider.getTask();
  if (scheme !== undefined)
    (task.trainingInformation as { scheme: string }).scheme = scheme;
  return mount(TrainerDashboard, {
    global: {
      directives: { Tippy },
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
    },
    props: {
      task,
      dataset: loadCSV(
        new File(
          [new Uint8Array(await fs.readFile("../datasets/titanic_train.csv"))],
          "titanic_train.csv",
        ),
      ),
    },
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  workers.length = 0;
});

it("increases accuracy when training alone", { timeout: 20_000 }, async () => {
  const wrapper = await setupForTask(undefined, true);
  let model: Model<"tabular"> | undefined;
  try {
    await wrapper.get("#train-locally-bttn").trigger("click");
    await wrapper.get("#start-training-bttn").trigger("click");
    const infos = wrapper.getComponent(TrainingInformation);
    await vi.waitFor(
      () => expect(infos.props("rounds").isEmpty()).toBe(false),
      {
        timeout: 15_000,
      },
    );
    expect(
      infos.props("rounds").last()?.epochs.last()?.training.accuracy,
    ).toBeGreaterThan(0);
    await vi.waitFor(() => expect(infos.props("isTraining")).toBe(false), {
      timeout: 5_000,
    });
    model = wrapper.emitted<[Model<"tabular">]>("model")?.at(-1)?.[0];
    if (model === undefined) throw new Error("No trained model emitted");
    expect((await modelEncode(model)).length).toBeGreaterThan(0);
  } finally {
    model?.dispose();
    wrapper.unmount();
  }
});

it("hides the participants when training alone", async () => {
  const wrapper = await setupForTask();
  try {
    expect(wrapper.text()).toContain("number of participants");
    await wrapper.get("#train-locally-bttn").trigger("click");
    expect(wrapper.text()).not.toContain("number of participants");
  } finally {
    wrapper.unmount();
  }
});

it("resets participants and terminates an unresponsive worker after stopping", async () => {
  const wrapper = await setupForTask(undefined, false);
  try {
    const infos = wrapper.getComponent(TrainingInformation);
    (wrapper.vm as unknown as { nbParticipants: number }).nbParticipants = 4;
    await wrapper.vm.$nextTick();
    expect(infos.props("nbParticipants")).toBe(4);
    await wrapper.get("#train-locally-bttn").trigger("click");
    await wrapper.get("#start-training-bttn").trigger("click");
    expect(infos.props("nbParticipants")).toBe(1);
    const stop = wrapper
      .findAll("button")
      .find((button) => button.text().includes("stop training"));
    if (stop === undefined) throw new Error("Stop button was not shown");
    vi.useFakeTimers();
    await stop.trigger("click");
    expect(workers.at(-1)?.messages.at(-1)).toEqual({ type: "stop" });
    expect(workers.at(-1)?.terminated).toBe(false);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(workers.at(-1)?.terminated).toBe(true);
    expect(infos.props("isTraining")).toBe(false);
  } finally {
    wrapper.unmount();
  }
});

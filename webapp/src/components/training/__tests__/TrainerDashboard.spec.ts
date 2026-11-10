import * as fs from "node:fs/promises";
import * as tf from "@tensorflow/tfjs";
import { CONFIG } from "@/config";
import {
  DecentralizedClient,
  defaultTasks,
  modelEncode,
  type Model,
} from "@epfml/discojs";
import { loadCSV } from "@epfml/discojs-web";
import { defineWebWorkers } from "@vitest/web-worker/pure";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { afterEach, expect, it, vi } from "vitest";
import { directive as Tippy } from "vue-tippy";
import TrainerDashboard from "../TrainerDashboard.vue";
import TrainingInformation from "../TrainingInformation.vue";

async function setupForTask(scheme?: "decentralized") {
  // Match browser execution: native TensorFlow optimizer arrays belong to
  // another realm and cannot be serialized by TFJS in jsdom.
  await tf.setBackend("cpu");
  defineWebWorkers({ clone: "native" });
  const provider = defaultTasks.titanic;

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
  if (scheme !== undefined) {
    (task.trainingInformation as { scheme: string }).scheme = scheme;
  }

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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

  await vi.waitFor(() => expect(infos.props("isTraining")).toBe(false), {
    timeout: 5_000,
  });
  const model = wrapper.emitted<[Model<"tabular">]>("model")?.at(-1)?.[0];
  if (model === undefined) throw new Error("No trained model emitted");
  try {
    // The completed session is closed, but its output must still be savable.
    expect((await modelEncode(model)).length).toBeGreaterThan(0);
  } finally {
    model.dispose();
    wrapper.unmount();
  }
});

it(
  "runs decentralized training with networking on main thread and compute in worker",
  { timeout: 20_000 },
  async () => {
    const connect = vi
      .spyOn(DecentralizedClient.prototype, "connect")
      .mockImplementation(async function (this: DecentralizedClient) {
        this.aggregator.registerNode("self");
        return await defaultTasks.titanic.modelCard.getModel();
      });
    const begin = vi
      .spyOn(DecentralizedClient.prototype, "onRoundBeginCommunication")
      .mockImplementation(() => Promise.resolve());
    const end = vi
      .spyOn(DecentralizedClient.prototype, "onRoundEndCommunication")
      .mockImplementation(async function (this: DecentralizedClient, weights) {
        const resultPromise = this.aggregator.getPromiseForAggregation();
        const payloads = await this.aggregator.makePayloads(weights);
        const selfPayload = payloads.get("self");
        if (selfPayload === undefined) {
          throw new Error("missing self payload from WorkerAggregator");
        }
        try {
          await this.aggregator.add("self", selfPayload, this.aggregator.round);
        } finally {
          payloads.forEach((w) => w.dispose());
        }
        return await resultPromise;
      });
    const finish = vi
      .spyOn(DecentralizedClient.prototype, "finishRound")
      .mockImplementation(() => undefined);
    const disconnect = vi
      .spyOn(DecentralizedClient.prototype, "disconnect")
      .mockImplementation(() => Promise.resolve());

    const wrapper = await setupForTask("decentralized");
    let model: Model<"tabular"> | undefined;
    try {
      await wrapper.get("#start-training-bttn").trigger("click");
      const infos = wrapper.getComponent(TrainingInformation);
      await vi.waitFor(
        () => expect(infos.props("rounds").isEmpty()).toBe(false),
        { timeout: 15_000 },
      );
      await vi.waitFor(() => expect(infos.props("isTraining")).toBe(false), {
        timeout: 5_000,
      });
      expect(connect).toHaveBeenCalledOnce();
      expect(begin).toHaveBeenCalled();
      expect(end).toHaveBeenCalled();
      expect(finish).toHaveBeenCalled();
      expect(disconnect).toHaveBeenCalledOnce();

      model = wrapper.emitted<[Model<"tabular">]>("model")?.at(-1)?.[0];
      if (model === undefined) throw new Error("No trained model emitted");
      expect((await modelEncode(model)).length).toBeGreaterThan(0);
    } finally {
      model?.dispose();
      wrapper.unmount();
    }
  },
);

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
    wrapper.unmount();
  },
);

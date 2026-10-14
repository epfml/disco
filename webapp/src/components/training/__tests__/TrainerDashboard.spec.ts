import * as fs from "node:fs/promises";
import * as tf from "@tensorflow/tfjs";
import { CONFIG } from "@/config";
import {
  DecentralizedClient,
  WeightsContainer,
  defaultTasks,
  modelEncode,
  weightsEncode,
  weightsDecode,
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
import type { FromWorker, ToWorker } from "../worker_messages";

const workers: FakeWorker[] = [];
class FakeWorker {
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
  receive(message: FromWorker): void {
    this.onmessage?.({ data: message } as MessageEvent<FromWorker>);
  }
}

async function setupForTask(scheme?: "decentralized", realTraining = false) {
  await tf.setBackend("cpu");
  const provider = defaultTasks.titanic;
  if (realTraining) defineWebWorkers({ clone: "native" });
  else vi.stubGlobal("Worker", FakeWorker);
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  workers.length = 0;
});

// jsdom cannot load browser WASM URLs. Keep actual training and model code,
// using the CPU backend as in the original component test.
vi.mock("../worker_backend", () => ({
  initializeTrainingBackend: () => tf.setBackend("cpu"),
}));

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

it("bridges decentralized connection, model sync, and round weights to the page", async () => {
  const connect = vi
    .spyOn(DecentralizedClient.prototype, "connect")
    .mockImplementation(() => defaultTasks.titanic.modelCard.getModel());
  const begin = vi
    .spyOn(DecentralizedClient.prototype, "onRoundBeginCommunication")
    .mockImplementation(function (this: DecentralizedClient) {
      this.emit("modelSynced", new WeightsContainer([tf.tensor([3])]));
      return Promise.resolve();
    });
  const end = vi
    .spyOn(DecentralizedClient.prototype, "onRoundEndCommunication")
    .mockImplementation((weights) => Promise.resolve(weights));
  const finish = vi
    .spyOn(DecentralizedClient.prototype, "finishRound")
    .mockImplementation(() => undefined);
  const disconnect = vi
    .spyOn(DecentralizedClient.prototype, "disconnect")
    .mockImplementation(() => Promise.resolve());
  const wrapper = await setupForTask("decentralized");
  try {
    await wrapper.get("#start-training-bttn").trigger("click");
    const worker = workers.at(-1);
    if (worker === undefined) throw new Error("Worker was not created");
    expect(worker.messages[0]).toMatchObject({
      type: "start",
      scheme: "decentralized",
    });

    worker.receive({
      type: "network-request",
      operation: "connect",
      requestId: 1,
    });
    await vi.waitFor(() =>
      expect(
        worker.messages.some(
          (m) => m.type === "network-response" && m.requestId === 1,
        ),
      ).toBe(true),
    );
    expect(connect).toHaveBeenCalledOnce();
    expect(
      worker.messages.find(
        (m) => m.type === "network-response" && m.requestId === 1,
      ),
    ).toMatchObject({ model: expect.any(Uint8Array) });

    worker.receive({
      type: "network-request",
      operation: "begin",
      requestId: 2,
    });
    await vi.waitFor(() =>
      expect(
        worker.messages.find(
          (m) => m.type === "network-response" && m.requestId === 2,
        ),
      ).toMatchObject({ syncedWeights: expect.any(Uint8Array) }),
    );
    expect(begin).toHaveBeenCalledOnce();

    const local = new WeightsContainer([tf.tensor([1, 2])]);
    const encoded = await weightsEncode(local);
    local.dispose();
    worker.receive({
      type: "network-request",
      operation: "end",
      requestId: 3,
      weights: encoded,
    });
    await vi.waitFor(() =>
      expect(
        worker.messages.find(
          (m) => m.type === "network-response" && m.requestId === 3,
        ),
      ).toMatchObject({ weights: expect.any(Uint8Array) }),
    );
    expect(end).toHaveBeenCalledOnce();
    expect(finish).toHaveBeenCalledOnce();
    const response = worker.messages.find(
      (m) => m.type === "network-response" && m.requestId === 3,
    );
    if (response?.type !== "network-response" || response.weights === undefined)
      throw new Error("Missing weights");
    const received = weightsDecode(response.weights);
    expect(Array.from(await received.weights[0].data())).toEqual([1, 2]);
    received.dispose();

    worker.receive({
      type: "network-request",
      operation: "disconnect",
      requestId: 4,
    });
    await vi.waitFor(() => expect(disconnect).toHaveBeenCalled());
  } finally {
    wrapper.unmount();
  }
});

it("streams data and progress through the worker and receives a savable model", async () => {
  const wrapper = await setupForTask();
  try {
    await wrapper.get("#train-locally-bttn").trigger("click");
    await wrapper.get("#start-training-bttn").trigger("click");
    const worker = workers.at(-1);
    if (worker === undefined) throw new Error("Worker was not created");
    expect(worker.messages[0]).toMatchObject({
      type: "start",
      scheme: "local",
    });

    worker.receive({ type: "data-request", requestId: 1, streamId: 1 });
    await vi.waitFor(() => expect(worker.messages).toHaveLength(2));
    expect(worker.messages[1]).toMatchObject({
      type: "data",
      requestId: 1,
      done: false,
      samples: expect.arrayContaining([
        expect.objectContaining({ Age: "22.0", Survived: "0", Pclass: "3" }),
      ]),
    });

    expect(
      worker.messages[1].type === "data" && worker.messages[1].samples,
    ).toHaveLength(16);

    const batch = { accuracy: 0.75, loss: 0.5, memoryUsage: 0.1 };
    worker.receive({ type: "batch", log: batch });
    worker.receive({ type: "epoch", batches: [batch], epochTime: 1 });
    worker.receive({ type: "round", participants: 1 });
    const infos = wrapper.getComponent(TrainingInformation);
    await vi.waitFor(() =>
      expect(
        infos.props("rounds").last()?.epochs.last()?.training.accuracy,
      ).toBe(0.75),
    );

    const model = await defaultTasks.titanic.modelCard.getModel();
    const encoded = await modelEncode(model);
    model.dispose();
    worker.receive({ type: "finished", stopped: false, model: encoded });
    await vi.waitFor(() => expect(infos.props("isTraining")).toBe(false));
    const trained = wrapper.emitted<[Model<"tabular">]>("model")?.at(-1)?.[0];
    if (trained === undefined) throw new Error("No trained model emitted");
    expect((await modelEncode(trained)).length).toBeGreaterThan(0);
    trained.dispose();
    expect(worker.terminated).toBe(true);
  } finally {
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

it("resets participants on a new session and sends a stop request", async () => {
  const wrapper = await setupForTask();
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
    await stop.trigger("click");
    expect(workers.at(-1)?.messages.at(-1)).toEqual({ type: "stop" });
  } finally {
    wrapper.unmount();
  }
});

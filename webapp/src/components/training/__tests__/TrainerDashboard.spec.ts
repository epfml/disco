import * as fs from "node:fs/promises";
import { Set } from "immutable";
import * as tf from "@tensorflow/tfjs";
import { CONFIG } from "@/config";
import {
  DecentralizedClient,
  WeightsContainer,
  weightsEncode,
  weightsDecode,
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
  receive(message: FromWorker): void {
    this.onmessage?.({ data: message } as MessageEvent<FromWorker>);
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

it("bridges decentralized connection, model sync, and round weights to the page", async () => {
  const connect = vi
    .spyOn(DecentralizedClient.prototype, "connect")
    .mockImplementation(() => defaultTasks.titanic.modelCard.getModel());
  const begin = vi
    .spyOn(DecentralizedClient.prototype, "onRoundBeginCommunication")
    .mockImplementation(function (this: DecentralizedClient) {
      const weights = new WeightsContainer([tf.tensor([3])]);
      this.emit("modelSynced", weights);
      weights.dispose();
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
  const wrapper = await setupForTask("decentralized", false);
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
    await vi.waitFor(() => expect(disconnect).toHaveBeenCalledOnce());
    wrapper.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  } finally {
    wrapper.unmount();
  }
});

it("cleans up a connection that completes after forced cancellation", async () => {
  const wrapper = await setupForTask("decentralized", false);
  const model = await defaultTasks.titanic.modelCard.getModel();
  let resolveConnect!: (model: Model<"tabular">) => void;
  vi.spyOn(DecentralizedClient.prototype, "connect").mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveConnect = resolve;
      }),
  );
  const disconnect = vi
    .spyOn(DecentralizedClient.prototype, "disconnect")
    .mockResolvedValue(undefined);
  const dispose = vi.spyOn(model, "dispose");
  try {
    await wrapper.get("#start-training-bttn").trigger("click");
    const worker = workers.at(-1);
    if (worker === undefined) throw new Error("Worker was not created");
    worker.receive({
      type: "network-request",
      operation: "connect",
      requestId: 1,
    });
    vi.useFakeTimers();
    const stop = wrapper
      .findAll("button")
      .find((button) => button.text().includes("stop training"));
    if (stop === undefined) throw new Error("Stop button was not shown");
    await stop.trigger("click");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(worker.terminated).toBe(true);
    expect(disconnect).toHaveBeenCalledOnce();
    vi.useRealTimers();
    resolveConnect(model);
    await vi.waitFor(() => expect(disconnect).toHaveBeenCalledTimes(2));
    expect(dispose).toHaveBeenCalledOnce();
    expect(
      worker.messages.some((message) => message.type === "network-response"),
    ).toBe(false);
  } finally {
    wrapper.unmount();
    if (dispose.mock.calls.length === 0) model.dispose();
  }
});

it.each([false, true])(
  "disposes buffered page contributions even when disconnect fails: %s",
  async (fails) => {
    const connect = vi
      .spyOn(DecentralizedClient.prototype, "connect")
      .mockImplementation(() => defaultTasks.titanic.modelCard.getModel());
    const disconnect = vi
      .spyOn(DecentralizedClient.prototype, "disconnect")
      .mockImplementation(() =>
        fails
          ? Promise.reject(new Error("disconnect failed"))
          : Promise.resolve(),
      );
    const wrapper = await setupForTask("decentralized", false);
    try {
      await wrapper.get("#start-training-bttn").trigger("click");
      const worker = workers.at(-1)!;
      worker.receive({
        type: "network-request",
        operation: "connect",
        requestId: 1,
      });
      await vi.waitFor(() =>
        expect(worker.messages.some((m) => m.type === "network-response")).toBe(
          true,
        ),
      );
      const client = connect.mock.contexts[0] as DecentralizedClient;
      const aggregator = client.aggregator;
      const dispose = vi.spyOn(aggregator, "dispose");
      const baseline = tf.memory().numTensors;
      aggregator.setNodes(Set(["self", "other"]));
      const contribution = new WeightsContainer([tf.tensor([1, 2])]);
      aggregator.add("self", contribution, 0);
      contribution.dispose();
      expect(tf.memory().numTensors).toBeGreaterThan(baseline);
      worker.receive({
        type: "network-request",
        operation: "disconnect",
        requestId: 2,
      });
      await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
      expect(tf.memory().numTensors).toBe(baseline);
      wrapper.unmount();
      expect(disconnect).toHaveBeenCalledOnce();
      expect(dispose).toHaveBeenCalledOnce();
    } finally {
      wrapper.unmount();
    }
  },
);

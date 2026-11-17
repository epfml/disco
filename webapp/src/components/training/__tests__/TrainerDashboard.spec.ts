import { File as NativeFile, Blob as NativeBlob } from "node:buffer";
import * as fs from "node:fs/promises";
import * as tf from "@tensorflow/tfjs";
import { CONFIG } from "@/config";
import {
  ClientCrashError,
  Disco,
  defaultTasks,
  modelDecode,
  modelEncode,
  type Model,
  type DataType,
  type Network,
} from "@epfml/discojs";
import type * as DiscoJS from "@epfml/discojs";
import { defineWebWorkers } from "@vitest/web-worker/pure";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { afterEach, expect, it, vi } from "vitest";
import { directive as Tippy } from "vue-tippy";
import TrainerDashboard from "../TrainerDashboard.vue";
import TrainingInformation from "../TrainingInformation.vue";
import type { FromWorker, ToWorker } from "../worker_messages";

vi.mock("@epfml/discojs", async (importOriginal) => {
  const actual = await importOriginal<typeof DiscoJS>();
  return { ...actual, modelDecode: vi.fn(actual.modelDecode) };
});
const toaster = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
}));
vi.mock("@/composables/toaster", () => ({ useToaster: () => toaster }));

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
  // Node structuredClone supports native Files, but not jsdom's File wrapper.
  // Adapt jsdom FileReader to native Blobs while exercising native cloning.
  const DOMFileReader = FileReader;
  vi.stubGlobal(
    "FileReader",
    class extends DOMFileReader {
      override readAsText(blob: Blob, encoding?: string): void {
        if (blob instanceof NativeBlob) {
          void blob
            .arrayBuffer()
            .then((bytes) => super.readAsText(new Blob([bytes]), encoding));
        } else super.readAsText(blob, encoding);
      }
    },
  );
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
      datasetSource: {
        type: "tabular",
        // Node and DOM File declarations differ; native cloning needs Node's implementation.
        file: new NativeFile(
          [new Uint8Array(await fs.readFile("../datasets/titanic_train.csv"))],
          "titanic_train.csv",
        ) as unknown as File,
      },
    },
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(modelDecode).mockReset();
  vi.clearAllMocks();
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

it.each(["training", "cleanup"] as const)(
  "keeps a saveable partial model when %s fails",
  { timeout: 20_000 },
  async (phase) => {
    // Retain the original method and call it with the current instance below.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const close = Disco.prototype.close;
    vi.spyOn(Disco.prototype, "close").mockImplementation(async function (
      this: Disco<DataType, Network>,
    ) {
      await close.call(this);
      throw new Error("cleanup failure");
    });
    if (phase === "training") {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const train = Disco.prototype.train;
      vi.spyOn(Disco.prototype, "train").mockImplementation(async function* (
        this: Disco<DataType, Network>,
        dataset,
        validationDataset,
      ) {
        for await (const round of train.call(
          this,
          dataset,
          validationDataset,
        )) {
          yield round;
          throw new ClientCrashError(
            "connection failed after a completed round",
          );
        }
      });
    }
    const wrapper = await setupForTask();
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
      await vi.waitFor(() => expect(infos.props("isTraining")).toBe(false));
      model = wrapper.emitted<[Model<"tabular">]>("model")?.at(-1)?.[0];
      if (model === undefined) throw new Error("Partial model was lost");
      expect((await modelEncode(model)).length).toBeGreaterThan(0);
      expect(toaster.error).toHaveBeenCalledExactlyOnceWith(
        phase === "training"
          ? "The server has disconnected you due to an unexpected event.<br/> Feel free to rejoin the training."
          : "An error occurred during training.",
      );
      expect(toaster.success).not.toHaveBeenCalled();
    } finally {
      model?.dispose();
      wrapper.unmount();
    }
  },
);

it("reports startup failures without requiring a partial model", async () => {
  const wrapper = await setupForTask();
  vi.stubGlobal("fetch", () => Promise.reject(new Error("server unavailable")));
  try {
    await wrapper.get("#train-locally-bttn").trigger("click");
    await wrapper.get("#start-training-bttn").trigger("click");
    await vi.waitFor(() =>
      expect(
        wrapper.getComponent(TrainingInformation).props("isTraining"),
      ).toBe(false),
    );
    expect(wrapper.emitted("model")).toBeUndefined();
    expect(toaster.error).toHaveBeenCalledExactlyOnceWith(
      "An error occurred during training.",
    );
    expect(toaster.success).not.toHaveBeenCalled();
  } finally {
    wrapper.unmount();
  }
});

it.each(["finished", "error"] as const)(
  "keeps the returned model when %s decoding crosses the stop deadline",
  async (type) => {
    const wrapper = await setupForTask(undefined, false);
    const dispose = vi.fn();
    const model = { dispose } as unknown as Model<"tabular">;
    let resolveDecode!: (model: Model<"tabular">) => void;
    vi.mocked(modelDecode).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDecode = resolve;
        }),
    );
    try {
      await wrapper.get("#train-locally-bttn").trigger("click");
      await wrapper.get("#start-training-bttn").trigger("click");
      vi.useFakeTimers();
      const stop = wrapper
        .findAll("button")
        .find((button) => button.text().includes("stop training"));
      if (stop === undefined) throw new Error("Stop button was not shown");
      await stop.trigger("click");
      await vi.advanceTimersByTimeAsync(9_900);
      const active = workers.at(-1);
      if (active === undefined) throw new Error("Worker was not started");
      active.receive(
        type === "finished"
          ? { type, stopped: true, model: new Uint8Array([1]) }
          : { type, message: "connection failed", model: new Uint8Array([1]) },
      );
      expect(modelDecode).toHaveBeenCalledOnce();
      // Further stop clicks during decoding must not rearm the watchdog.
      await stop.trigger("click");
      await vi.advanceTimersByTimeAsync(10_100);
      expect(active.terminated).toBe(false);
      expect(
        active.messages.filter((message) => message.type === "stop"),
      ).toHaveLength(1);
      resolveDecode(model);
      await vi.advanceTimersByTimeAsync(0);
      expect(wrapper.emitted("model")?.at(-1)).toEqual([model]);
      expect(dispose).not.toHaveBeenCalled();
      expect(active.terminated).toBe(true);
      expect(
        wrapper.getComponent(TrainingInformation).props("isTraining"),
      ).toBe(false);
      expect(toaster.success).not.toHaveBeenCalled();
      if (type === "error") expect(toaster.error).toHaveBeenCalledOnce();
      else expect(toaster.info).toHaveBeenCalledWith("Training stopped");
    } finally {
      wrapper.unmount();
    }
  },
);

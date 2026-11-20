import { File as NativeFile } from "node:buffer";
import { Set } from "immutable";
import { shallowMount, flushPromises } from "@vue/test-utils";
import { afterEach, expect, it, vi } from "vitest";
import { defaultTasks } from "@epfml/discojs";
import LabeledDatasetInput from "../LabeledDatasetInput.vue";
import FileSelection from "../FileSelection.vue";
import TabularDatasetInput from "../TabularDatasetInput.vue";
import TextDatasetInput from "../TextDatasetInput.vue";
import ByGroup from "../LabeledImageDatasetInput/ByGroup.vue";
import ByCSV from "../LabeledImageDatasetInput/ByCSV.vue";
import { loadDataset, type DatasetSource } from "../source";

const toaster = vi.hoisted(() => ({ error: vi.fn(), warning: vi.fn() }));
vi.mock("@/composables/toaster", () => ({ useToaster: () => toaster }));
afterEach(() => vi.clearAllMocks());

const global = { renderStubDefaultSlot: true };

it.each([
  ["tabular", TabularDatasetInput],
  ["text", TextDatasetInput],
] as const)(
  "forwards and clears the selected %s file",
  async (type, component) => {
    const wrapper = shallowMount(component, { global });
    try {
      const file = new NativeFile(["hello"], "data.txt");
      const selection = wrapper.getComponent(FileSelection);
      selection.vm.$emit("update:modelValue", Set([file]));
      await flushPromises();
      const source = wrapper
        .emitted<[DatasetSource]>("update:modelValue")
        ?.at(-1)?.[0];
      expect(source).toEqual({ type, file });
      expect(structuredClone(source)).toMatchObject({ type });
      if (type === "text" && source !== undefined) {
        const chunks: string[] = [];
        for await (const chunk of loadDataset(structuredClone(source)))
          chunks.push(chunk as string);
        expect(chunks.join("")).toBe("hello");
      }
      selection.vm.$emit("update:modelValue", undefined);
      await flushPromises();
      expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([undefined]);
    } finally {
      wrapper.unmount();
    }
  },
);

it("preserves image labels when files are selected by group", async () => {
  const wrapper = shallowMount(ByGroup, {
    props: { labels: Set(["cat", "dog"]) },
    global,
  });
  try {
    const cat = new NativeFile(["cat pixels"], "cat.png");
    const dog = new NativeFile(["dog pixels"], "dog.png");
    const selections = wrapper.findAllComponents(FileSelection);
    selections[0].vm.$emit("update:modelValue", Set([cat]));
    selections[1].vm.$emit("update:modelValue", Set([dog]));
    await flushPromises();
    const source = wrapper
      .emitted<[DatasetSource]>("update:modelValue")
      ?.at(-1)?.[0];
    if (source?.type !== "image") throw new Error("Missing image files");
    expect(source.files).toEqual(
      expect.arrayContaining([
        { file: cat, label: "cat" },
        { file: dog, label: "dog" },
      ]),
    );
    const cloned = structuredClone(source);
    for (const { file, label } of cloned.files)
      expect(await file.text()).toBe(`${label} pixels`);
  } finally {
    wrapper.unmount();
  }
});

it("preserves CSV label mappings when forwarding image files", async () => {
  const wrapper = shallowMount(ByCSV, { global });
  try {
    const selections = wrapper.findAllComponents(FileSelection);
    selections[0].vm.$emit(
      "update:modelValue",
      Set([new NativeFile(["filename,label\nscan,healthy\n"], "labels.csv")]),
    );
    await flushPromises();
    const file = new NativeFile(["pixels"], "scan.png");
    selections[1].vm.$emit("update:modelValue", Set([file]));
    await flushPromises();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      { type: "image", files: [{ file, label: "healthy" }] },
    ]);
    selections[1].vm.$emit("update:modelValue", undefined);
    await flushPromises();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([undefined]);
  } finally {
    wrapper.unmount();
  }
});

async function setupLabeledInput() {
  const task = await defaultTasks.titanic.getTask();
  task.trainingInformation.inputColumns = ["Age"];
  task.trainingInformation.outputColumn = "Survived";
  const wrapper = shallowMount(LabeledDatasetInput, {
    props: {
      task,
      modelValue: undefined,
      "onUpdate:modelValue": (value: DatasetSource | undefined) => {
        void wrapper.setProps({ modelValue: value });
      },
    },
    global,
  });
  return wrapper;
}

it("emits a file source after CSV validation and propagates parent clearing", async () => {
  const wrapper = await setupLabeledInput();
  try {
    const file = new File(["Age,Survived\n24,1\n"], "data.csv");
    const input = wrapper.getComponent(TabularDatasetInput);
    input.vm.$emit("update:modelValue", { type: "tabular", file });
    await vi.waitFor(() =>
      expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
        { type: "tabular", file },
      ]),
    );
    expect(toaster.error).not.toHaveBeenCalled();
    await wrapper.setProps({ modelValue: undefined });
    expect(input.props("modelValue")).toBeUndefined();
  } finally {
    wrapper.unmount();
  }
});

it.each([
  ["Age,other\n24,x\n", "missing columns Survived"],
  ["Age,Survived\n,1\n", 'column "Age" is missing a value'],
  ["Age,Survived\n", "doesn't contain any row"],
])("rejects invalid CSV before emitting a source: %s", async (csv, error) => {
  const wrapper = await setupLabeledInput();
  try {
    const input = wrapper.getComponent(TabularDatasetInput);
    input.vm.$emit("update:modelValue", {
      type: "tabular",
      file: new File([csv], "data.csv"),
    });
    await vi.waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith(
        expect.stringContaining(error),
      ),
    );
    expect(
      wrapper
        .emitted<[DatasetSource | undefined]>("update:modelValue")
        ?.some(([value]) => value !== undefined),
    ).not.toBe(true);
    expect(input.props("modelValue")).toBeUndefined();
  } finally {
    wrapper.unmount();
  }
});

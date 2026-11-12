import { File as NativeFile } from "node:buffer";
import { Set } from "immutable";
import { shallowMount, flushPromises } from "@vue/test-utils";
import { expect, it } from "vitest";
import FileSelection from "../FileSelection.vue";
import TabularDatasetInput from "../TabularDatasetInput.vue";
import TextDatasetInput from "../TextDatasetInput.vue";
import ByGroup from "../LabeledImageDatasetInput/ByGroup.vue";
import ByCSV from "../LabeledImageDatasetInput/ByCSV.vue";
import { loadDataset, type DatasetSource } from "../source";

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
        .emitted<[DatasetSource]>("update:source")
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
      expect(wrapper.emitted("update:source")?.at(-1)).toEqual([undefined]);
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
      .emitted<[DatasetSource]>("update:source")
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
    expect(wrapper.emitted("update:source")?.at(-1)).toEqual([
      { type: "image", files: [{ file, label: "healthy" }] },
    ]);
    selections[1].vm.$emit("update:modelValue", undefined);
    await flushPromises();
    expect(wrapper.emitted("update:source")?.at(-1)).toEqual([undefined]);
  } finally {
    wrapper.unmount();
  }
});

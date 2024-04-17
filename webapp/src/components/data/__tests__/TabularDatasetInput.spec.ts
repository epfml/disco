import { Set } from "immutable";
import { expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

import type { Tabular } from "@epfml/discojs";

import TabularDatasetInput from "../TabularDatasetInput.vue";
import FileSelection from "../FileSelection.vue";

it("emits dataset when adding a file", async () => {
  const wrapper = mount(TabularDatasetInput, {
    props: {
      validator: (row: Tabular) =>
        Set(Object.keys(row)).isSuperset(Set.of("a", "b", "c")),
    },
  });

  expect(wrapper.find(".text-gray-500").isVisible()).to.be.false;

  wrapper
    .getComponent(FileSelection)
    .getCurrentComponent()
    .emit(
      "files",
      Set.of(new File([["a,b,c", "1,2,3"].join("\n")], "train.csv")),
    );

  while (wrapper.emitted("dataset") === undefined) await flushPromises();

  const events = wrapper.emitted("dataset");
  expect(events).to.be.of.length(1);
});

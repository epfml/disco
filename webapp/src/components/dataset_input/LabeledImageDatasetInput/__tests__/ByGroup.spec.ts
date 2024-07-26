import { Set } from "immutable";
import { expect, it } from "vitest";
import { directive as Tippy } from "vue-tippy";
import { mount } from "@vue/test-utils";

import { data, defaultTasks } from "@epfml/discojs";
import { WebTabularLoader } from "@epfml/discojs-web";

import ByGroup from "../ByGroup.vue";
import FileSelection from "../../FileSelection.vue";

it("shows passed labels", async () => {
  const task = defaultTasks.titanic.getTask();
  const datasetBuilder = new data.DatasetBuilder(
    new WebTabularLoader(task),
    task,
  );

  const wrapper = mount(ByGroup, {
    props: {
      labels: Set.of("first", "second", "third"),
      datasetBuilder,
    },
    global: { directives: { Tippy } },
  });

  const fileSelectors = wrapper.findAllComponents(FileSelection);
  expect(fileSelectors).to.be.of.length(3);
});

it("adds to dataset builder when inputting file", async () => {
  const task = defaultTasks.titanic.getTask();
  const datasetBuilder = new data.DatasetBuilder(
    new WebTabularLoader(task),
    task,
  );

  const wrapper = mount(ByGroup, {
    props: {
      labels: Set.of("file"),
      datasetBuilder,
    },
    global: { directives: { Tippy } },
  });

  await wrapper
    .getComponent(FileSelection)
    .setValue(Set.of(new File([], "file.png")));

  expect(datasetBuilder.size).to.equals(1);
});

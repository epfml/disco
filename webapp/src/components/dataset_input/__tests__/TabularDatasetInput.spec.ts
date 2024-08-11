import { Set } from "immutable";
import * as fs from "node:fs/promises";
import { expect, it } from "vitest";
import { directive as Tippy } from "vue-tippy";
import { flushPromises, mount } from "@vue/test-utils";

import { data, defaultTasks } from "@epfml/discojs";
import { WebTabularLoader } from "@epfml/discojs-web";

import TabularDatasetInput from "../TabularDatasetInput.vue";
import FileSelection from "../FileSelection.vue";

it("adds to builder when inputting a file", async () => {
  const task = defaultTasks.titanic.getTask();
  const datasetBuilder = new data.DatasetBuilder(
    new WebTabularLoader(task),
    task,
  );
  const file = new File(
    [await fs.readFile("../datasets/titanic_train.csv")],
    "titanic_train.csv",
  );
  datasetBuilder.addFiles([file]);

  const wrapper = mount(TabularDatasetInput, {
    props: { datasetBuilder },
    global: { directives: { Tippy } },
  });

  await wrapper
    .getComponent(FileSelection)
    .setValue(Set.of());
  // CSV checker is async
  await flushPromises();

  expect(datasetBuilder.sources).to.have.same.members([file]);
});

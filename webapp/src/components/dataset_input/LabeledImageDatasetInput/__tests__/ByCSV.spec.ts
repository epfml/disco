import { Set } from "immutable";
import { expect, it } from "vitest";
import { directive as Tippy } from "vue-tippy";
import { flushPromises, mount } from "@vue/test-utils";

import { data, defaultTasks } from "@epfml/discojs";
import { WebTabularLoader } from "@epfml/discojs-web";

import ByCSV from "../ByCSV.vue";
import FileSelection from "../../FileSelection.vue";

it("adds to dataset builder when adding CSV then images", async () => {
  const task = defaultTasks.titanic.getTask();
  const datasetBuilder = new data.DatasetBuilder(
    new WebTabularLoader(task),
    task,
  );

  // jsdom doesn't implement .text on File/Blob
  // trick from https://github.com/jsdom/jsdom/issues/2555
  const file = await (
    await fetch(
      [
        "data:,filename,label",
        "first,first",
        "second,second",
        "third,third",
      ].join("%0A"), // data URL content need to be url-encoded
    )
  ).blob();

  const wrapper = mount(ByCSV, {
    props: { datasetBuilder },
    global: { directives: { Tippy } },
  });

  const [csvSelector, folderSelector] =
    wrapper.findAllComponents(FileSelection);
  await csvSelector.setValue(Set.of(file));
  await flushPromises(); // handler is async

  await folderSelector.setValue(
    Set.of(
      new File([], "first.png"),
      new File([], "second.png"),
      new File([], "third.png"),
      new File([], "unrelated.png"),
    ),
  );

  expect(datasetBuilder.size).to.equals(3);
});

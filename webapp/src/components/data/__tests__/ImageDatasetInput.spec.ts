import { Set } from "immutable";
import { expect, it } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

import ImageDatasetInput from "../ImageDatasetInput.vue";
import FileSelection from "../FileSelection.vue";

it("updates dataset builder when adding multiple files", async () => {
  const wrapper = mount(ImageDatasetInput, {
    props: {
      labels: Set.of("first", "second", "third"),
      isOnlyPrediction: false,
    },
  });

  const labelsByGroup = wrapper.findAll("button")[1];
  expect(labelsByGroup.text()).to.equal("group");
  await labelsByGroup.trigger("click");

  const fileSelectors = wrapper
    .findAllComponents(FileSelection)
    .filter((w) => w.isVisible())
    .map((w) => w.getCurrentComponent());
  expect(fileSelectors).to.be.of.length(3);

  fileSelectors[0].emit("files", Set.of( new File([], "first.csv")))
  fileSelectors[1].emit("files", Set.of( new File([], "second.csv")))
  fileSelectors[2].emit("files", Set.of( new File([], "third.csv")))

  const events = wrapper.emitted("dataset");
  expect(events).to.be.of.length(1);
});

it("updates dataset builder when adding a folder", async () => {
  const wrapper = mount(ImageDatasetInput, {
    props: {
      labels: Set.of("first", "second", "third"),
      isOnlyPrediction: false,
    },
  });

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

  const [csvSelector, folderSelector] = wrapper
    .findAllComponents(FileSelection)
    .filter((w) => w.isVisible())
    .map((w) => w.getCurrentComponent());

  csvSelector.emit("files", Set.of(file));
  await flushPromises(); // handler is async

  folderSelector.emit("files", Set.of(
    new File([], "first.csv"),
    new File([], "second.csv"),
    new File([], "third.csv"),
    new File([], "unrelated.csv"),
  ));

  const events = wrapper.emitted("dataset");
  expect(events).to.be.of.length(1);
});

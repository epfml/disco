import { expect, it } from "vitest";

import { serialization, defaultTasks } from "../index.js";

it("can encode what it decodes", async () => {
  const task = await defaultTasks.wikitext.getTask();

  const serialized = serialization.task.serializeToJSON(task);
  const deserialized = await serialization.task.deserializeFromJSON(serialized);

  expect(deserialized).to.be.deep.equal(task);
});

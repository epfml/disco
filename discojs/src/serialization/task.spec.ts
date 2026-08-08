import { expect, it } from "vitest";

import { defaultTasks } from "#root/index";
import { deserializeFromJSON, serializeToJSON } from "#serialization/task";

it("can encode what it decodes", async () => {
  const task = await defaultTasks.wikitext.getTask();

  const serialized = serializeToJSON(task);
  const deserialized = await deserializeFromJSON(serialized);

  expect(deserialized).to.be.deep.equal(task);
});

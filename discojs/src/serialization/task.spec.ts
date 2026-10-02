import { expect, it } from "vitest";

import { defaultTasks } from "#root/index";
import { deserializeFromJSON, serializeToJSON } from "#serialization/task";

it.each([defaultTasks.wikitext, defaultTasks.shakespeare])(
  "can encode what it decodes",
  async (provider) => {
    const task = await provider.getTask();

    const serialized = serializeToJSON(task);
    const deserialized = await deserializeFromJSON(serialized);

    expect(deserialized).to.be.deep.equal(task);
  },
);

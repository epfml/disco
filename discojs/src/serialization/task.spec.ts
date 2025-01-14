import { expect } from "chai";

import { serialization, defaultTasks } from "../index.js";

it("can encode what it decodes", async () => {
  const task = await defaultTasks.wikitext.getTask();

  const encoded = serialization.task.encode(task);
  expect(serialization.isEncoded(encoded)).to.be.true;
  const decoded = await serialization.task.decode(encoded);

  expect(decoded).to.be.deep.equal(task);
});

import { assert, describe, expect, it } from "vitest";

import type { Task } from "@epfml/discojs";
import { defaultTasks, serializeTaskToJSON } from "@epfml/discojs";

import type { AccessPolicy } from "./task_set.js";
import { TaskSet } from "./task_set.js";
import { titanicModelSet } from "../tests/utils.js";
import { generateToken, hashToken } from "./access_token.js";

const tokenHash = "a-token-hash";

/** TaskSet able to hold the titanic task */
async function setup(): Promise<{
  taskSet: TaskSet;
  task: Task<"tabular", "federated">;
  modelID: string;
}> {
  return {
    taskSet: new TaskSet(await titanicModelSet()),
    task: await defaultTasks.titanic.getTask(),
    modelID: defaultTasks.titanic.modelCard.card.id,
  };
}

describe("TaskSet", () => {
  it("makes tasks public by default", async () => {
    const { taskSet, task, modelID } = await setup();

    taskSet.addTask(task, modelID);

    expect(taskSet.policies.get(task.id)).to.deep.equal({
      visibility: "public",
    });
  });

  it("keeps the given access policy next to the task", async () => {
    const { taskSet, task, modelID } = await setup();
    const policy: AccessPolicy = {
      visibility: "private",
      tokenHash,
    };

    taskSet.addTask(task, modelID, policy);

    expect(taskSet.policies.get(task.id)).to.equal(policy);
  });

  it("doesn't leak the token hash through the task", async () => {
    const { taskSet, task, modelID } = await setup();
    const emitted: unknown[] = [];
    taskSet.on("newTask", (taskAndModel) => {
      emitted.push(taskAndModel);
    });

    taskSet.addTask(task, modelID, {
      visibility: "private",
      tokenHash,
    });

    const stored = taskSet.tasks.get(task.id);
    assert(stored !== undefined);
    expect(JSON.stringify(serializeTaskToJSON(stored[0]))).not.to.include(
      tokenHash,
    );
    expect(JSON.stringify(emitted)).not.to.include(tokenHash);
  });

  it("serves a model given directly without adding it to the ModelSet", async () => {
    const { task } = await setup();
    const modelSet = await titanicModelSet();
    const taskSet = new TaskSet(modelSet);
    const encoded = Uint8Array.of(4, 5, 6);

    taskSet.addTask(task, encoded);

    expect(taskSet.tasks.get(task.id)?.[1]).to.equal(encoded);
    expect(modelSet.models.size).to.equal(1); // only titanic's
  });

  it("doesn't change the policy when adding a duplicate task", async () => {
    const { taskSet, task, modelID } = await setup();
    const policy: AccessPolicy = {
      visibility: "private",
      tokenHash,
    };
    taskSet.addTask(task, modelID, policy);

    expect(() => taskSet.addTask(task, modelID)).to.throw(
      "added task already exists",
    );
    expect(taskSet.policies.get(task.id)).to.equal(policy);
  });

  describe("canAccess", () => {
    it("denies unknown tasks", async () => {
      const { taskSet } = await setup();

      expect(taskSet.canAccess("unknown-task", generateToken())).to.be.false;
    });

    it("allows anyone on a public task", async () => {
      const { taskSet, task, modelID } = await setup();
      taskSet.addTask(task, modelID);

      expect(taskSet.canAccess(task.id)).to.be.true;
      expect(taskSet.canAccess(task.id, generateToken())).to.be.true;
    });

    it("allows a private task only with its token", async () => {
      const { taskSet, task, modelID } = await setup();
      const token = generateToken();
      taskSet.addTask(task, modelID, {
        visibility: "private",
        tokenHash: hashToken(token),
      });

      expect(taskSet.canAccess(task.id, token)).to.be.true;
      expect(taskSet.canAccess(task.id)).to.be.false;
      expect(taskSet.canAccess(task.id, generateToken())).to.be.false;
      // the stored hash isn't a token of its own
      expect(taskSet.canAccess(task.id, hashToken(token))).to.be.false;
    });
  });
});

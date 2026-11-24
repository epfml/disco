import { assert, describe, expect, it } from "vitest";

import type { Task } from "@epfml/discojs";
import { defaultTasks, serializeTaskToJSON } from "@epfml/discojs";

import type { AccessPolicy } from "./task_set.js";
import { TaskSet } from "./task_set.js";
import { titanicModelSet } from "../tests/utils.js";

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
});

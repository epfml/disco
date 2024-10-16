import createDebug from "debug";
import { Map } from "immutable";

import type { Model } from "../index.js";
import { serialization } from "../index.js";

import type { Task, TaskID } from "./task.js";
import { isTask } from "./task.js";

const debug = createDebug("discojs:task:handlers");

function urlToTasks(base: URL): URL {
  const ret = new URL(base);
  ret.pathname += "tasks";
  return ret;
}

export async function pushTask(
  base: URL,
  task: Task,
  model: Model,
): Promise<void> {
  await fetch(urlToTasks(base), {
    method: "POST",
    body: JSON.stringify({
      task,
      model: await serialization.model.encode(model),
      weights: await serialization.weights.encode(model.weights),
    }),
  });
}

export async function fetchTasks(base: URL): Promise<Map<TaskID, Task>> {
  const response = await fetch(urlToTasks(base));
  const tasks: unknown = await response.json();

  if (!Array.isArray(tasks)) {
    throw new Error(
      "Expected to receive an array of Tasks when fetching tasks",
    );
  } else if (!tasks.every(isTask)) {
    for (const task of tasks) {
      if (!isTask(task)) {
        debug("task has invalid format: :O", task);
      }
    }
    throw new Error(
      "invalid tasks response, the task object received is not well formatted",
    );
  }

  return Map(tasks.map((t) => [t.id, t]));
}

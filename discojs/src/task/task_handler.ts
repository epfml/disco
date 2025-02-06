import { Map } from "immutable";

import type { DataType, Model } from "../index.js";
import { serialization } from "../index.js";

import { Task } from "./task.js";

function urlToTasks(base: URL): URL {
  const ret = new URL(base);
  ret.pathname += "tasks";
  return ret;
}

export async function pushTask<D extends DataType>(
  base: URL,
  task: Task<D>,
  model: Model<D>,
): Promise<void> {
  const response = await fetch(urlToTasks(base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: [...serialization.task.encode(task)],
      model: [...await serialization.model.encode(model)],
    }),
  });
  if (!response.ok) throw new Error(`fetch: HTTP status ${response.status}`);
}

export async function fetchTasks(
  base: URL,
): Promise<Map<Task.ID, Task<DataType>>> {
  const response = await fetch(urlToTasks(base));
  if (!response.ok) throw new Error(`fetch: HTTP status ${response.status}`);
  const json: unknown = await response.json();

  if (
    !Array.isArray(json) ||
    !json.every((raw) => Array.isArray(raw)) ||
    !json.every((arr) => arr.every((e) => typeof e === "number"))
  )
    throw new Error(
      "invalid tasks response: expected an array of array of numbers",
    );

  try {
    const tasks = await Promise.all(
      json
        .map((raw) => Uint8Array.from(raw))
        .map((t) => serialization.task.decode(t)),
    );

    return Map(tasks.map((t) => [t.id, t]));
  } catch (cause) {
    throw new Error("invalid tasks response: unable to parse all tasks", {
      cause,
    });
  }
}

import { Map, Seq } from "immutable";

import type { DataType, Network } from "#types/index";
import type { Model } from "#models/index";
import {
  serializeTaskToJSON,
  deserializeTaskFromJSON,
  modelEncode,
  JSONLike,
} from "#serialization/index";

import type { Task } from "./task.js";

function urlToTasks(base: URL): URL {
  const ret = new URL(base);
  ret.pathname += "tasks";
  return ret;
}

/**
 * Add a task to a server.
 *
 * The model is either one to upload along with the task, or the ID of a model
 * the server already knows about, as listed by `fetchModels`.
 */
export async function pushTask<D extends DataType>(
  base: URL,
  task: Task<D, Network>,
  model: Model<D> | ModelCardInfo.ID,
): Promise<void> {
  const response = await fetch(urlToTasks(base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: serializeTaskToJSON(task),
      model:
        typeof model === "string"
          ? model
          : [...(await modelEncode(model))],
    }),
  });
  if (!response.ok) throw new Error(`fetch: HTTP status ${response.status}`);
}

export async function fetchTasks(
  base: URL,
): Promise<Map<Task.ID, Task<DataType, Network>>> {
  const response = await fetch(urlToTasks(base));
  if (!response.ok) throw new Error(`fetch: HTTP status ${response.status}`);
  const json = (await response.json()) as JSONLike;

  if (!Array.isArray(json))
    throw new Error("invalid tasks response: expected a JSON array");
  const arr = json;

  try {
    return Map(
      Seq(await Promise.all(arr.map((t) => deserializeTaskFromJSON(t)))).map(
        (t) => [t.id, t],
      ),
    );
  } catch (cause) {
    throw new Error("invalid tasks response: unable to parse all tasks", {
      cause,
    });
  }
}

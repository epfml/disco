import { Map, Seq } from "immutable";

import type { DataType, Model, Network } from "../index.js";
import { serialization } from "../index.js";
import type { ModelCardInfo } from "#models/model_card";

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
      task: serialization.task.serializeToJSON(task),
      model:
        typeof model === "string"
          ? model
          : [...(await serialization.model.encode(model))],
    }),
  });
  if (!response.ok) throw new Error(`fetch: HTTP status ${response.status}`);
}

export async function fetchTasks(
  base: URL,
): Promise<Map<Task.ID, Task<DataType, Network>>> {
  const response = await fetch(urlToTasks(base));
  if (!response.ok) throw new Error(`fetch: HTTP status ${response.status}`);
  const json = (await response.json()) as serialization.JSON;

  if (!Array.isArray(json))
    throw new Error("invalid tasks response: expected a JSON array");
  const arr = json;

  try {
    return Map(
      Seq(
        await Promise.all(
          arr.map((t) => serialization.task.deserializeFromJSON(t)),
        ),
      ).map((t) => [t.id, t]),
    );
  } catch (cause) {
    throw new Error("invalid tasks response: unable to parse all tasks", {
      cause,
    });
  }
}

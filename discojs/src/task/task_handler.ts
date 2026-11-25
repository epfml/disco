import { Map, Seq } from "immutable";
import { z } from "zod";

import type { DataType, Network } from "#types/index";
import type { Model, ModelCardInfo } from "#models/index";
import type { JSONLike } from "#serialization/index";
import {
  serializeTaskToJSON,
  deserializeTaskFromJSON,
  modelEncode,
} from "#serialization/index";

import type { Task } from "#task/task";
import { assertCanSendToken } from "#utils/token_transport";

function urlToTasks(base: URL): URL {
  const ret = new URL(base);
  ret.pathname += "tasks";
  return ret;
}

/**
 * Add a task to a server, which gives it a random ID.
 *
 * The model is either one to upload along with the task, or the ID of a model
 * the server already knows about, as listed by `fetchModels`.
 *
 * A private task is only listed, served and joinable with the returned token.
 * The server only keeps its hash, so this is the only time it is given.
 *
 * @returns the created task, with its ID
 */
export async function pushTask<D extends DataType>(
  base: URL,
  task: Task.Definition<D, Network>,
  model: Model<D> | ModelCardInfo.ID,
): Promise<Task<D, Network>>;
export async function pushTask<D extends DataType>(
  base: URL,
  task: Task.Definition<D, Network>,
  model: Model<D> | ModelCardInfo.ID,
  options: { private: true },
): Promise<{ task: Task<D, Network>; token: string }>;
export async function pushTask<D extends DataType>(
  base: URL,
  task: Task.Definition<D, Network>,
  model: Model<D> | ModelCardInfo.ID,
  options?: { private: true },
): Promise<Task<D, Network> | { task: Task<D, Network>; token: string }> {
  const isPrivate = options?.private === true;
  // the server answers with the token
  if (isPrivate) assertCanSendToken(base);

  const response = await fetch(urlToTasks(base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: serializeTaskToJSON(task),
      model:
        typeof model === "string" ? model : [...(await modelEncode(model))],
      private: isPrivate,
    }),
  });
  if (!response.ok) throw new Error(`fetch: HTTP status ${response.status}`);

  const parsed = z
    .object({ id: z.string(), token: z.string().optional() })
    .safeParse(await response.json());
  if (!parsed.success)
    throw new Error("invalid task creation response: expected an ID");
  const { id, token } = parsed.data;
  const created = { ...task, id };

  if (!isPrivate) return created;
  if (token === undefined)
    throw new Error("invalid task creation response: expected a token");
  return { task: created, token };
}

/**
 * Fetch a single task, which is the only way to get a private one.
 *
 * @param token of the task, if private
 */
export async function fetchTask(
  base: URL,
  id: Task.ID,
  token?: string,
): Promise<Task<DataType, Network>> {
  if (token !== undefined) assertCanSendToken(base);

  const url = urlToTasks(base);
  url.pathname += `/${encodeURIComponent(id)}`;

  const response = await fetch(url, {
    headers: token === undefined ? {} : { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`fetch: HTTP status ${response.status}`);

  return await deserializeTaskFromJSON((await response.json()) as JSONLike);
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

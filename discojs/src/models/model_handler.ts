import { Map } from "immutable";
import { z } from "zod";

import type { DataType } from "#types/index";

import { ModelCardInfo } from "#models/index";

function urlToModels(base: URL): URL {
  const ret = new URL(base);
  ret.pathname += "models";
  return ret;
}

/**
 * Get the models a server makes available.
 *
 * Their IDs are what `pushTask` expects to link a new task to an existing model.
 */
export async function fetchModels(
  base: URL,
): Promise<Map<ModelCardInfo.ID, ModelCardInfo<DataType>>> {
  const response = await fetch(urlToModels(base));
  if (!response.ok) throw new Error(`fetch: HTTP status ${response.status}`);

  const parsed = z.array(ModelCardInfo.schema).safeParse(await response.json());
  if (!parsed.success)
    throw new Error("invalid models response: unable to parse all models", {
      cause: parsed.error,
    });

  return Map(
    parsed.data.map((info): [ModelCardInfo.ID, ModelCardInfo<DataType>] => [
      info.id,
      info,
    ]),
  );
}

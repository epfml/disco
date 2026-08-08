import { z } from "zod";
import type { DataType, Network } from "#dtypes/index";
import { Task } from "#task/task";
import { Tokenizer } from "#models/index";

import type { JSONLike } from "./json_like.js";

export function serializeToJSON(task: Task<DataType, Network>): JSONLike {
  switch (task.dataType) {
    case "image":
    case "tabular":
      return task;
    case "text": {
      return {
        ...task,
        trainingInformation: {
          ...task.trainingInformation,
          tokenizer: task.trainingInformation.tokenizer.name,
        },
      };
    }
  }
}

export async function deserializeFromJSON(
  serialized: JSONLike,
): Promise<Task<DataType, Network>> {
  return await z
    .looseObject({
      trainingInformation: z.looseObject({
        tokenizer: z
          .string()
          .transform((name) => Tokenizer.from_pretrained(name))
          .optional(),
      }),
    })
    .pipe(Task.schema)
    .parseAsync(serialized);
}

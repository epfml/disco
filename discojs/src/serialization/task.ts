import { z } from "zod";
import type { DataType, Network } from "../index.js";
import { Task, Tokenizer } from "../index.js";

import type { JSON } from "./index.js";

export function serializeToJSON(task: Task<DataType, Network>): JSON {
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

// Throws if an error serialized object is malformed
export async function deserializeFromJSON(
  serialized: JSON,
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

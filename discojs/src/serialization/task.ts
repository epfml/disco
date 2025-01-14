import type { DataType } from "../index.js";
import { Task } from "../index.js";

import { Encoded } from "./coder.js";
import * as coder from "./coder.js";

export function encode(task: Task<DataType>): Encoded {
  let serialized;
  switch (task.dataType) {
    case "image":
    case "tabular":
      serialized = task as Task<"image" | "tabular">;
      break;
    case "text": {
      const t = task as Task<"text">;

      serialized = {
        ...t,
        trainingInformation: {
          ...t.trainingInformation,
          tokenizer: t.trainingInformation.tokenizer.name,
        },
      };
      break;
    }
  }

  return coder.encode(serialized);
}

export async function decode(encoded: Encoded): Promise<Task<DataType>> {
  const raw = coder.decode(encoded);
  const task = await Task.schema.parseAsync(raw);
  return task;
}

import { z } from "zod";
import type { DataType } from "../index.js";
import { Task, Tokenizer } from "../index.js";

import type { JSON } from "./index.js";

export function serializeToJSON(task: Task<DataType>): JSON {
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
	serialized: JSON,
): Promise<Task<DataType>> {
	return await z
		.object({
			trainingInformation: z
				.object({
					tokenizer: z
						.string()
						.transform((name) => Tokenizer.from_pretrained(name))
						.optional(),
				})
				.passthrough(),
		})
		.passthrough()
		.pipe(Task.schema)
		.parseAsync(serialized);
}

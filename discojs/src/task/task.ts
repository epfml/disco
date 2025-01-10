import { z } from "zod";

import { DataType } from "../index.js";

import {
  isDisplayInformation,
  DisplayInformation,
} from "./display_information.js";
import {
  isTrainingInformation,
  TrainingInformation,
} from "./training_information.js";

export namespace Task {
  export type ID = string;
}

export interface Task<D extends DataType> {
  id: Task.ID;
  dataType: D;
  displayInformation: DisplayInformation<D>;
  trainingInformation: TrainingInformation<D>;
}

const baseTaskSchema = z.object({
  id: z.string(),
});

export namespace Task {
  export const schema = z.discriminatedUnion("dataType", [
    baseTaskSchema.extend({
      dataType: z.literal("image"),
      displayInformation: DisplayInformation.schemas["image"],
      trainingInformation: TrainingInformation.schemas["image"],
    }),
    baseTaskSchema.extend({
      dataType: z.literal("tabular"),
      displayInformation: DisplayInformation.schemas["tabular"],
      trainingInformation: TrainingInformation.schemas["tabular"],
    }),
    baseTaskSchema.extend({
      dataType: z.literal("text"),
      displayInformation: DisplayInformation.schemas["text"],
      trainingInformation: TrainingInformation.schemas["text"],
    }),
  ]);
}

export function isTaskID(obj: unknown): obj is Task.ID {
  return typeof obj === "string";
}

export function isTask(raw: unknown): raw is Task<DataType> {
  if (typeof raw !== "object" || raw === null) {
    return false;
  }

  const {
    id,
    dataType,
    displayInformation,
    trainingInformation,
  }: Partial<Record<keyof Task<DataType>, unknown>> = raw;

  switch (dataType) {
    case "image":
    case "tabular":
    case "text":
      break;
    default:
      return false;
  }
  if (
    !isTaskID(id) ||
    !isDisplayInformation(dataType, displayInformation) ||
    !isTrainingInformation(dataType, trainingInformation)
  ) {
    return false;
  }

  const _: Task<DataType> = {
    id,
    dataType,
    displayInformation,
    trainingInformation,
  } satisfies Record<keyof Task<DataType>, unknown>;

  return true;
}

import { DataType } from "../index.js";

import {
  isDisplayInformation,
  type DisplayInformation,
} from "./display_information.js";
import {
  isTrainingInformation,
  type TrainingInformation,
} from "./training_information.js";

export type TaskID = string;

export interface Task<D extends DataType> {
  id: TaskID;
  dataType: D;
  displayInformation: DisplayInformation<D>;
  trainingInformation: TrainingInformation<D>;
}

export function isTaskID(obj: unknown): obj is TaskID {
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

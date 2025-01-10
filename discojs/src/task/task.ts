import { z } from "zod";

import { DataType } from "../index.js";

import { DisplayInformation } from "./display_information.js";
import { TrainingInformation } from "./training_information.js";

export namespace Task {
  export type ID = string;
}

const baseSchema = z.object({
  id: z.string(),
});

export namespace Task {
  export const schemas = {
    image: baseSchema.extend({
      dataType: z.literal("image"),
      displayInformation: DisplayInformation.schemas["image"],
      trainingInformation: TrainingInformation.schemas["image"],
    }),
    tabular: baseSchema.extend({
      dataType: z.literal("tabular"),
      displayInformation: DisplayInformation.schemas["tabular"],
      trainingInformation: TrainingInformation.schemas["tabular"],
    }),
    text: baseSchema.extend({
      dataType: z.literal("text"),
      displayInformation: DisplayInformation.schemas["text"],
      trainingInformation: TrainingInformation.schemas["text"],
    }),
  };

  export const schema = z.discriminatedUnion("dataType", [
    schemas.image,
    schemas.tabular,
    schemas.text,
  ]);
}

export type Task<D extends DataType> = DataTypeToTask[D];
interface DataTypeToTask {
  image: z.infer<typeof Task.schemas.image>;
  tabular: z.infer<typeof Task.schemas.tabular>;
  text: z.infer<typeof Task.schemas.text>;
}

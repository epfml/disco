import { z } from "zod";

import { DataType } from "../types/index.js";

export namespace DisplayInformation {
  const baseSchema = z.object({
    title: z.string(),
    summary: z.object({
      preview: z.string(),
      overview: z.string(),
    }),
    dataFormatInformation: z.string().optional(),
    model: z.string().optional(),
    sampleDataset: z
      .object({
        // URL to download a dataset for the task, is displayed in the UI when asking to connect data
        link: z.string(),
        // Instructions to download, unzip, and connect the right file of the sample dataset
        instructions: z.string(),
      })
      .optional(),
  });

  export const schemas = {
    image: baseSchema.extend({
      // url to an image
      dataExample: z.string().optional(),
    }),
    tabular: baseSchema.extend({
      dataExample: z
        .array(z.object({ name: z.string(), data: z.string() }))
        .optional(),
    }),
    text: baseSchema.extend({
      dataExample: z.string().optional(),
    }),
  } satisfies Record<DataType, unknown>;
}

export type DisplayInformation<D extends DataType> =
  DataTypeToDisplayInformation[D];
interface DataTypeToDisplayInformation {
  image: z.infer<typeof DisplayInformation.schemas.image>;
  tabular: z.infer<typeof DisplayInformation.schemas.tabular>;
  text: z.infer<typeof DisplayInformation.schemas.text>;
}

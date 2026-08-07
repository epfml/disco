import { z } from "zod";

import type { DataType } from "#dtypes/index";

export namespace DisplayInformation {
  export const baseSchema = z.object({
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

  export const dataTypeToSchema = {
    image: z.object({
      // url to an image
      dataExample: z.string().optional(),
    }),
    tabular: z.object({
      dataExample: z
        .array(z.object({ name: z.string(), data: z.string() }))
        .optional(),
    }),
    text: z.object({
      dataExample: z.string().optional(),
    }),
  } satisfies Record<DataType, unknown>;
}

export type DisplayInformation<D extends DataType> =
  (typeof DisplayInformation.dataTypeToSchema)[D];

import { z } from "zod";

import type { DataType, Network } from "#dtypes/index";

import { DisplayInformation } from "#task/display_information";
import { TrainingInformation } from "#task/training_information";

export namespace Task {
  export type ID = string;

  export const baseSchema = z.object({
    id: z.string(),
    displayInformation: DisplayInformation.baseSchema,
    trainingInformation: TrainingInformation.baseSchema,
  });

  export const dataTypeToSchema = {
    image: z.object({
      dataType: z.literal("image"),
      displayInformation: DisplayInformation.dataTypeToSchema.image,
      trainingInformation: TrainingInformation.dataTypeToSchema.image,
    }),
    tabular: z.object({
      dataType: z.literal("tabular"),
      displayInformation: DisplayInformation.dataTypeToSchema.tabular,
      trainingInformation: TrainingInformation.dataTypeToSchema.tabular,
    }),
    text: z.object({
      dataType: z.literal("text"),
      displayInformation: DisplayInformation.dataTypeToSchema.text,
      trainingInformation: TrainingInformation.dataTypeToSchema.text,
    }),
  } satisfies Record<DataType, unknown>;

  export const networkToSchema = {
    decentralized: z.object({
      trainingInformation: TrainingInformation.networkToSchema.decentralized,
    }),
    federated: z.object({
      trainingInformation: TrainingInformation.networkToSchema.federated,
    }),
    local: z.object({
      trainingInformation: TrainingInformation.networkToSchema.local,
    }),
  } satisfies Record<Network, unknown>;

  export const schema = baseSchema
    .and(
      z.union([
        dataTypeToSchema.image,
        dataTypeToSchema.tabular,
        dataTypeToSchema.text,
      ]),
    )
    .and(
      z.union([
        networkToSchema.decentralized,
        networkToSchema.federated,
        networkToSchema.local,
      ]),
    );
}

export type Task<D extends DataType, N extends Network> = z.infer<
  typeof Task.baseSchema
> &
  z.infer<(typeof Task.dataTypeToSchema)[D]> &
  z.infer<(typeof Task.networkToSchema)[N]>;

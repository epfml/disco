import { z } from "zod";

import type { DataType, Network } from "#types/index";

import { DisplayInformation } from "#task/display_information";
import { TrainingInformation } from "#task/training_information";

export namespace Task {
  export type ID = string;

  /** Fields shared by every task's definition, which has no ID yet */
  export const baseSchema = z.object({
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

  /** Schema of a task's definition, without the ID the server gives it */
  export const definitionSchema = baseSchema
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

  export const schema = definitionSchema.and(z.object({ id: z.string() }));

  /**
   * A task as its creator defines it.
   * The server then gives it its ID, which nobody can pick nor guess.
   */
  export type Definition<D extends DataType, N extends Network> = z.infer<
    typeof baseSchema
  > &
    z.infer<(typeof dataTypeToSchema)[D]> &
    z.infer<(typeof networkToSchema)[N]>;
}

export type Task<D extends DataType, N extends Network> = Task.Definition<
  D,
  N
> & { id: Task.ID };

import { z } from "zod";
import type { Model } from "#models/model";
import type { DataType } from "#dtypes/index";
import { dataTypeValues } from "#dtypes/index";

export namespace ModelCardInfo {
  export type ID = string;

  export const baseFields = {
    id: z.string(),
    name: z.string(),
    preTrained: z.boolean(),
    contextLength: z.number().optional(),
  };

  export const schema = z.object({
    ...baseFields,
    dataType: z.enum(dataTypeValues),
  });

  // Runtime-checked schema for each data type
  export function dataTypedSchema<D extends DataType>(dataType: D) {
    return z.object({
      ...baseFields,
      dataType: z.literal(dataType),
    });
  }

  export type Of<D extends DataType> = z.infer<
    ReturnType<typeof dataTypedSchema<D>>
  >;
}

export type ModelCardInfo<D extends DataType> = ModelCardInfo.Of<D>;

export interface ModelCard<D extends DataType> {
  card: ModelCardInfo<D>;
  getModel(): Promise<Model<D>>;
}

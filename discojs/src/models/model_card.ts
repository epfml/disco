import { z } from "zod";
import type { Model } from "#models/index";
import type { DataType } from "#dtypes/index";

namespace ModelCardInfo {
  export type ID = string;

  export const schema = z.object({
    id: z.string(),
    name: z.string(),
    preTrained: z.boolean(),
    contextLength: z.number().optional(),
  });
}

type ModelCardInfo = z.infer<typeof ModelCardInfo.schema>;

export interface ModelCard<D extends DataType> {
  card: ModelCardInfo;
  getModel(): Promise<Model<D>>;
}

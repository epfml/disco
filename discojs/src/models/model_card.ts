import { z } from "zod";
import type { DataType, Model } from "../index.js";

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

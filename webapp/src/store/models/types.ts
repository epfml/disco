import type { Map } from "immutable";

import type { serialization } from "@epfml/discojs";

export type ModelID = number;

export interface Infos {
  taskID: string;
  dateSaved: Date;
  encoded: serialization.Encoded;
}

// only `ref` is `idToModel`
export type State = {
  idToModel: Map<ModelID, Infos>;
};


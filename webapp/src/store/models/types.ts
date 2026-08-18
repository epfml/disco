import type { Map } from "immutable";

import type { Encoded } from "@epfml/discojs";

export type ModelID = number;

export interface Infos {
  taskID: string;
  dateSaved: Date;
  encoded: Encoded;
}

// only `ref` is `idToModel`
export type State = {
  idToModel: Map<ModelID, Infos>;
};

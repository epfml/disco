export * as model from "./model.js";
export * as task from "./task.js";
export * as weights from "./weights.js";

export type { Encoded } from "./coder.js";
export { isEncoded } from "./coder.js";

export type JSON =
  | null
  | undefined
  | boolean
  | number
  | string
  | JSON[]
  | { [_: string]: JSON };

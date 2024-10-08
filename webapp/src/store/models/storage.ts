import type { StoreOptions } from "pinia-plugin-persistedstate-2";

import { LocalStorage } from "./local_storage";
import { OPFS } from "./opfs";
import type { State } from "./types";

export type Storage = Required<
  Pick<StoreOptions<State>, "deserialize" | "serialize" | "storage">
> & {
  // approx assuming that `encoded` size far outweigh other fields
  EFFICIENCY: number;
};

export const UNSUPPORTED_STORAGE = new Error("unsupported storage");

export function bestStorage(): Storage {
  try {
    return new OPFS();
  } catch (e) {
    if (e !== UNSUPPORTED_STORAGE) throw e;
  }

  return new LocalStorage();
}

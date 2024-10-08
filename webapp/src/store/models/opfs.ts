import { Map } from "immutable";
import * as msgpack from "@msgpack/msgpack";
import type { IStorage } from "pinia-plugin-persistedstate-2";

import { serialization } from "@epfml/discojs";

import type { Storage } from "./storage";
import { UNSUPPORTED_STORAGE } from "./storage";
import type { Infos, ModelID, State } from "./types";

// https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
export class OPFS implements Storage {
  readonly EFFICIENCY = 1;

  // TODO bump to newer ES to use top-level await
  readonly #dir: Promise<FileSystemDirectoryHandle>;

  constructor() {
    if (!("storage" in navigator)) throw UNSUPPORTED_STORAGE;

    this.#dir = navigator.storage
      .getDirectory()
      .then((root) => root.getDirectoryHandle("models", { create: true }));
  }

  get storage(): IStorage {
    const dir = this.#dir;

    return {
      async getItem(key: string): Promise<Uint8Array | null> {
        try {
          const file = await dir
            .then((d) => d.getFileHandle(key))
            .then((handle) => handle.getFile());

          return new Uint8Array(await file.arrayBuffer());
        } catch (e) {
          if (e instanceof DOMException && e.name === "NotFoundError")
            return null;
          throw e;
        }
      },
      async setItem(key: string, value: Uint8Array): Promise<void> {
        const file = await dir
          .then((d) => d.getFileHandle(key, { create: true }))
          .then((handle) => handle.createWritable());

        await file.write(value);
        await file.close();
      },
      async removeItem(key: string): Promise<void> {
        await dir.then((d) => d.removeEntry(key));
      },
    };
  }

  serialize(state: State): Uint8Array {
    return msgpack.encode(state.idToModel.toArray() satisfies OPFS.Serialized);
  }
  deserialize(encoded: Uint8Array): State {
    const raw: unknown = msgpack.decode(encoded);
    if (!OPFS.isSerialized(raw)) throw new Error("unexpected serialized state");

    return { idToModel: Map(raw) };
  }
}
export namespace OPFS {
  export type Serialized = Array<[ModelID, Infos]>;

  export function isSerialized(raw: unknown): raw is OPFS.Serialized {
    if (!Array.isArray(raw) || !raw.every(isSerializedItem)) return false;

    const _: OPFS.Serialized = raw;

    return true;
  }
}

function isSerializedItem(raw: unknown): raw is OPFS.Serialized[0] {
  if (!Array.isArray(raw) || raw.length !== 2) return false;

  const [id, infos]: unknown[] = raw;

  if (typeof id !== "number" || !isSerializedInfos(infos)) return false;

  const _: OPFS.Serialized[0] = [id, infos];

  return true;
}

function isSerializedInfos(raw: unknown): raw is OPFS.Serialized[0][1] {
  if (typeof raw !== "object" || raw === null) return false;

  const {
    taskID,
    encoded,
    dateSaved,
  }: Partial<Record<keyof OPFS.Serialized[0][1], unknown>> = raw;

  if (
    typeof taskID !== "string" ||
    !serialization.isEncoded(encoded) ||
    !(dateSaved instanceof Date)
  )
    return false;

  const _: OPFS.Serialized[0][1] = {
    taskID,
    encoded,
    dateSaved,
  } satisfies Record<keyof OPFS.Serialized[0][1], unknown>;

  return true;
}

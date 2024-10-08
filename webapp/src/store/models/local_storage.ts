import { Map, Range } from "immutable";

import { useToaster } from "@/composables/toaster";

import type { Storage } from "./storage";
import type { ModelID, State } from "./types";

const toaster = useToaster();

export class LocalStorage implements Storage {
  // encoding as base16, so one byte encoded as two
  readonly EFFICIENCY = 0.5;

  // https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria#web_storage
  static readonly #MAX_SIZE = 5 * 1024 * 1024;

  readonly storage = localStorage;

  serialize(state: State): string {
    let size = 0;
    const keptModels = state.idToModel
      .sortBy((infos) => infos.encoded.length)
      .takeWhile((infos) => {
        // encoded size way outweights other fields
        // serialized efficiency of 50%
        size += infos.encoded.length * 2;
        return size < LocalStorage.#MAX_SIZE;
      });

    if (!state.idToModel.equals(keptModels))
      toaster.warning(
        [
          "Your browser' storage is too small to persist all models.",
          "Only keeping smaller ones.",
        ].join(" "),
      );

    return JSON.stringify(
      keptModels
        .map(({ taskID, dateSaved, encoded }) => ({
          taskID,
          dateSaved: dateSaved.getTime(),
          // Uint8Array is very inefficiently encoded in JSON, Window.{atob,btoa} is broken
          // using hex encoding (base16)
          encoded: [...encoded]
            .flatMap((b) => [(b >> 4).toString(16), (b & 0xf).toString(16)])
            .join(""),
        }))
        .toArray() satisfies LocalStorage.Serialized,
    );
  }
  deserialize(encoded: string): State {
    const raw: unknown = JSON.parse(encoded);

    if (!LocalStorage.isSerialized(raw))
      throw new Error("unexpected serialized state");

    return {
      idToModel: Map(raw).map(({ taskID, dateSaved, encoded }) => ({
        taskID,
        dateSaved: new Date(dateSaved),
        encoded: Uint8Array.from(
          Range(0, encoded.length / 2).map((i) =>
            Number.parseInt(encoded.slice(i * 2, i * 2 + 2), 16),
          ),
        ),
      })),
    };
  }
}
export namespace LocalStorage {
  export type Serialized = Array<
    [
      ModelID,
      {
        taskID: string;
        dateSaved: number;
        encoded: string;
      },
    ]
  >;

  export function isSerialized(raw: unknown): raw is LocalStorage.Serialized {
    if (!Array.isArray(raw) || !raw.every(isSerializedItem)) return false;

    const _: LocalStorage.Serialized = raw;

    return true;
  }
}

function isSerializedItem(raw: unknown): raw is LocalStorage.Serialized[0] {
  if (!Array.isArray(raw) || raw.length !== 2) return false;

  const [id, infos]: unknown[] = raw;

  if (typeof id !== "number" || !isSerializedInfos(infos)) return false;

  const _: LocalStorage.Serialized[0] = [id, infos];

  return true;
}

function isSerializedInfos(raw: unknown): raw is LocalStorage.Serialized[0][1] {
  if (typeof raw !== "object" || raw === null) return false;

  const {
    taskID,
    encoded,
    dateSaved,
  }: Partial<Record<keyof LocalStorage.Serialized[0][1], unknown>> = raw;

  if (
    typeof taskID !== "string" ||
    !(
      typeof encoded === "string" &&
      encoded.length % 2 === 0 &&
      // check for any character outside of the hex range
      encoded.match(/[^0-9a-f]/) === null
    ) ||
    typeof dateSaved !== "number"
  )
    return false;

  const _: LocalStorage.Serialized[0][1] = {
    taskID,
    encoded,
    dateSaved,
  } satisfies Record<keyof LocalStorage.Serialized[0][1], unknown>;

  return true;
}

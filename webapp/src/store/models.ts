import { Map, Range } from "immutable";
import type { StateTree } from "pinia";
import { defineStore } from "pinia";
import { computed, ref, toRaw } from "vue";

import type { DataType, Model } from "@epfml/discojs";
import { serialization } from "@epfml/discojs";

export type ModelID = number;

interface Infos {
  taskID: string;
  dateSaved: Date;
}
type IDToModel = Map<ModelID, Infos & { encoded: serialization.model.Encoded }>;

type Serialized = Array<
  [ModelID, { taskID: string; dateSaved: number; encoded: string }]
>;

export const useModelsStore = defineStore(
  "models",
  () => {
    const idToModel = ref<IDToModel>(Map());

    const infos = computed(() =>
      idToModel.value.map(({ taskID, dateSaved, encoded }) => ({
        taskID,
        dateSaved,
        // approx assuming that `encoded` size far outweigh other fields
        // encoding as base16 which has a 50% efficiency
        storageSize: encoded.length * 2,
      })),
    );

    async function get(id: ModelID): Promise<Model<DataType> | undefined> {
      const infos = idToModel.value.get(id);
      if (infos === undefined) return undefined;

      return await serialization.model.decode(toRaw(infos.encoded));
    }

    async function add(
      taskID: string,
      model: Model<DataType>,
    ): Promise<ModelID> {
      const dateSaved = new Date();
      const id = dateSaved.getTime();

      idToModel.value = idToModel.value.set(id, {
        taskID,
        dateSaved,
        encoded: await serialization.model.encode(model),
      });

      return id;
    }

    function remove(id: ModelID): void {
      idToModel.value = idToModel.value.delete(id);
    }

    return {
      idToModel,
      infos,
      get,
      add,
      remove,
    };
  },
  {
    persist: {
      // only `ref` is `idToModel`, only serializing that
      serializer: {
        serialize(state: StateTree): string {
          return JSON.stringify(
            (state.idToModel as IDToModel)
              .map(({ taskID, dateSaved, encoded }) => ({
                taskID,
                dateSaved: dateSaved.getTime(),
                // Uint8Array is very inefficiently encoded in JSON, Window.{atob,btoa} is broken
                // using hex encoding (base16)
                encoded: [...encoded]
                  .flatMap((b) => [
                    (b >> 4).toString(16),
                    (b & 0xf).toString(16),
                  ])
                  .join(""),
              }))
              .toArray() satisfies Serialized,
          );
        },
        deserialize(raw: string): { idToModel: IDToModel } {
          return {
            idToModel: Map((JSON.parse(raw) as Serialized) ?? []).map(
              ({ taskID, dateSaved, encoded }) => ({
                taskID,
                dateSaved: new Date(dateSaved),
                encoded: Uint8Array.from(
                  Range(0, encoded.length / 2).map((i) =>
                    Number.parseInt(encoded.slice(i * 2, i * 2 + 2), 16),
                  ),
                ),
              }),
            ),
          };
        },
      },
    },
  },
);

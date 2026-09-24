import { Map } from "immutable";
import { defineStore } from "pinia";
import { computed, shallowRef, toRaw } from "vue";

import type { DataType, Model } from "@epfml/discojs";
import { modelEncode, modelDecode } from "@epfml/discojs";

import { bestStorage } from "./storage";
import type { ModelID, State } from "./types";

export type { ModelID };

const BEST_STORAGE = bestStorage();

export const useModelsStore = defineStore(
  "models",
  () => {
    const idToModel = shallowRef<State["idToModel"]>(Map());

    const infos = computed(() =>
      idToModel.value.map(({ taskID, dateSaved, dataType, encoded }) => ({
        taskID,
        dateSaved,
        dataType,
        storageSize: encoded.length / BEST_STORAGE.EFFICIENCY,
      })),
    );

    async function get(id: ModelID): Promise<Model<DataType> | undefined> {
      const infos = idToModel.value.get(id);
      if (infos === undefined) return undefined;

      return await modelDecode(toRaw(infos.encoded));
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
        dataType: model.datatype,
        encoded: await modelEncode(model),
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
    persistedState: Object.assign(BEST_STORAGE, { persist: true }),
  },
);

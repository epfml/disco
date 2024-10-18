import { Map } from "immutable";
import { defineStore } from "pinia";
import { computed, shallowRef, toRaw } from "vue";

import type { Model } from "@epfml/discojs";
import { serialization } from "@epfml/discojs";

import { bestStorage } from "./storage";
import type { ModelID, State } from "./types";

export type { ModelID };

const BEST_STORAGE = bestStorage();

export const useModelsStore = defineStore(
  "models",
  () => {
    const idToModel = shallowRef<State["idToModel"]>(Map());

    const infos = computed(() =>
      idToModel.value.map(({ taskID, dateSaved, encoded }) => ({
        taskID,
        dateSaved,
        storageSize: encoded.length / BEST_STORAGE.EFFICIENCY,
      })),
    );

    async function get(id: ModelID): Promise<Model | undefined> {
      const infos = idToModel.value.get(id);
      if (infos === undefined) return undefined;

      return await serialization.model.decode(toRaw(infos.encoded));
    }

    async function add(taskID: string, model: Model): Promise<ModelID> {
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
    persistedState: Object.assign(BEST_STORAGE, { persist: true }),
  },
);

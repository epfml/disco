import { defineStore } from "pinia";
import { ref } from "vue";

import type { ModelID } from "./models";

export const useValidationStore = defineStore("validation", () => {
  const step = ref<0 | 1 | 2>(0);
  const mode = ref<"predict" | "test">();
  const modelID = ref<ModelID>();

  return { step, mode, modelID };
});

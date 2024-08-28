import { defineStore } from "pinia";
import { ref } from "vue";

export const useValidationStore = defineStore("validation", () => {
  const step = ref<0 | 1 | 2>(0);
  const mode = ref<"predict" | "test">();
  const modelID = ref<string>();

  return { step, mode, modelID };
});

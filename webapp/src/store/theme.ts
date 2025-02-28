import { defineStore } from "pinia";
import type { Ref } from "vue";
import { computed, ref } from "vue";

export const useThemeStore = defineStore("theme", () => {
    const current = ref<"light" | "dark">("light");

    /**
     * A simple utility function to return either of the two arguments based on the current theme.
     * Returns the first argument if the current theme is light, otherwise the second argument.
     */
    function selectByTheme(lightModeValue: string, darkModeValue: string): Ref<string> {
        return computed(() =>
          current.value === "light" ? lightModeValue : darkModeValue,
        );
    }

    return { current, selectByTheme };
  },
  { persistedState: { persist: true } },
);
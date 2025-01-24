import { defineStore } from "pinia";

export const useThemeStore = defineStore("theme", {
  state: () => {
    return { currentTheme: "light" };
  },
  actions: {
    toggleTheme() {
      const newTheme = this.currentTheme === "light" ? "dark" : "light";
      this.currentTheme = newTheme;
    },
  },
});

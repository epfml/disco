import { ref, watch } from "vue";
import { useThemeStore } from "@/store/theme";

export default function getThemeColor(lightThemeColor:string, darkThemeColor:string) {
  const themeStore = useThemeStore();
  
  function getColor(theme: "light" | "dark") {
    return (theme === "light") ? lightThemeColor : darkThemeColor;
  }
  
  const color = ref(getColor(themeStore.currentTheme));
  watch(
    () => themeStore.currentTheme,
    (newValue) => { color.value = getColor(newValue) },
  );

  return color
}

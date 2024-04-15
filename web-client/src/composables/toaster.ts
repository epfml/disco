import { useToast } from "vue-toast-notification";
import "vue-toast-notification/dist/theme-default.css";

export const useToaster = () => useToast({ duration: 5000 });

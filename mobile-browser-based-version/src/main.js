import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "@/assets/css/tailwind.css";
import "@/assets/css/styles.css";
import Toaster from "@meforma/vue-toaster";
import { store } from "./store/store";
import { InlineSvgPlugin } from "vue-inline-svg";

const app = createApp(App);

app.use(store);
app.use(InlineSvgPlugin);

app
  .use(Toaster)
  .use(router)
  .mount("#app");

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "@/assets/css/tailwind.css";
import "@/assets/css/styles.css";
import Toaster from "@meforma/vue-toaster";
import { store } from "./store/store";
import { createI18n } from 'vue-i18n'
const decentralized = require('./platform/decentralised.json');
const federated     = require('./platform/federated.json');
const app = createApp(App);
const i18n = createI18n({
  locale: 'de', // set locale
  fallbackLocale: 'de', // set fallback locale
  messages : {
    de: decentralized,
    fe: federated,
  }, // set locale messages
})
app.use(store);
app.use(i18n);
app
  .use(Toaster)
  .use(router)
  .mount("#app");

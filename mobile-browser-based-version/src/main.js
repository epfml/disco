import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "@/assets/css/tailwind.css";
import "@/assets/css/styles.css";
import Toaster from "@meforma/vue-toaster";
import { store } from "./store/store";
import { createI18n } from 'vue-i18n'
// load plaform strings
const decentralized  = require('./platform/decentralised.json');
const federated      = require('./platform/federated.json');
const defaultContent = require('./platform/default.json');
const i18n = createI18n({
  locale: 'de',              // set locale
  fallbackLocale: 'default', // common variables 
  messages : {               // set locale texts
    de: decentralized,
    fe: federated,
    default: defaultContent,
  }, 
})

// create vue app
const app = createApp(App);
app.use(store);
app.use(i18n);
app
  .use(Toaster)
  .use(router)
  .mount("#app");

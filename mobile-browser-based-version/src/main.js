import { createApp } from 'vue';
import App from './components/App.vue';
import router from './router';
import '@/assets/css/tailwind.css';
import '@/assets/css/styles.css';
import Toaster from '@meforma/vue-toaster';
import { store } from './store/store';
import { createI18n } from 'vue-i18n';

// Load plaform strings
const decentralized = require('./platform/decentralised.json');
const federated = require('./platform/federated.json');
const defaultContent = require('./platform/default.json');
const i18n = createI18n({
  locale: 'de', // Set locale
  fallbackLocale: 'default', // Common variables
  messages: {
    // Set locale texts
    de: decentralized,
    fe: federated,
    default: defaultContent,
  },
});

// Create vue app
const app = createApp(App);
app.use(store).use(i18n).use(Toaster).use(router).mount('#app');

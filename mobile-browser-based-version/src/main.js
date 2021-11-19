import { createApp } from 'vue';
import App from './components/App.vue';
import router from './router';
import '@/assets/css/tailwind.css';
import '@/assets/css/styles.css';
import Toaster from '@meforma/vue-toaster';
import { store } from './store/store';
import { createCustomI18n } from './platforms/i18n.js';

// create vue app
const app = createApp(App);
const i18n = createCustomI18n();
app.use(store).use(i18n).use(Toaster).use(router).mount('#app');

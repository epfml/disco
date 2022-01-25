// import devtools from '@vue/devtools';
import { createApp } from 'vue'
import App from './components/App.vue'
import router from './router'
import '@/assets/css/tailwind.css'
import '@/assets/css/styles.css'
import Toaster from '@meforma/vue-toaster'
import { createCustomI18n } from './platforms/i18n'
import VueApexCharts from 'vue3-apexcharts'

/* if (
  process.env.NODE_ENV === 'development' &&
  process.env.DEV_TOOLS === 'enabled'
) {
  devtools.connect('http://localhost', 8081);
} */
// create vue app
const app = createApp(App)
const i18n = createCustomI18n()
app
  .use(VueApexCharts)
  .use(i18n)
  .use(Toaster)
  .use(router)
  .mount('#app')

// import devtools from '@vue/devtools';
import { createApp } from 'vue'
import App from './components/App.vue'
import router from './router'
import Toaster from '@meforma/vue-toaster'
import { store } from './store/store'
import { createCustomI18n } from './platforms/i18n'
import VueApexCharts from 'vue3-apexcharts'

import '@/assets/css/tailwind.css'
import '@/assets/css/styles.css'

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
  .use(store)
  .use(VueApexCharts)
  .use(i18n)
  .use(Toaster, {
    // display time of the toast notications
    duration: 3000
  })
  .use(router)
  .mount('#app')

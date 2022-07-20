// import devtools from '@vue/devtools';
import { createApp } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import Toaster from '@meforma/vue-toaster'

import App from '@/components/App.vue'
import router from '@/router'
import store from '@/store'
import { createCustomI18n } from './locales/i18n'

import '@/assets/css/tailwind.css'
import '@/assets/css/styles.css'

import { tf } from 'discojs'

tf.ready()
  .then(() => console.log(`Loaded ${tf.getBackend()} backend`))
  .catch(console.error)

/* if (
  process.env.NODE_ENV === 'development' &&
  process.env.DEV_TOOLS === 'enabled'
) {
  devtools.connect('http://localhost', 8080);
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

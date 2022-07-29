import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueApexCharts from 'vue3-apexcharts'
import Toaster from '@meforma/vue-toaster'

import App from '@/components/App.vue'
import { router } from '@/router'
import { createCustomI18n } from './locales/i18n'

import '@/assets/css/tailwind.css'
import '@/assets/css/styles.css'

import { tf } from 'discojs'

tf.ready()
  .then(() => console.log(`Loaded ${tf.getBackend()} backend`))
  .catch(console.error)

// create vue app
const app = createApp(App)
const pinia = createPinia()
const i18n = createCustomI18n()
app
  .use(pinia)
  .use(VueApexCharts)
  .use(i18n)
  .use(Toaster, { duration: 5000 })
  .use(router)
  .mount('#app')

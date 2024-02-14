import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueApexCharts from 'vue3-apexcharts'
import { createToaster, Toaster } from '@meforma/vue-toaster'

import App from '@/components/App.vue'
import { router } from '@/router'
import { createCustomI18n } from './locales/i18n'

import '@/assets/css/tailwind.css'
import '@/assets/css/styles.css'

import { tf } from '@epfml/discojs'

tf.ready()
  .then(() => console.log(`Loaded ${tf.getBackend()} backend`))
  .catch(console.error)

// create vue app
const app = createApp(App)

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  const toaster = createToaster({ duration: 5000 })
  if (err instanceof TypeError) {
    // Implementation bug
    toaster.error('Sorry, something went wrong on our side. Please reach out on slack.')
  } else {
    // Unknown error
    toaster.error('Something went wrong. Please try again later or reach out on slack.')
  }
  console.error(err, instance, info)
}

const pinia = createPinia()
const i18n = createCustomI18n()
app
  .use(pinia)
  .use(VueApexCharts)
  .use(i18n)
  .use(Toaster, { duration: 5000 })
  .use(router)
  .mount('#app')

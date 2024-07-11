import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/components/App.vue'
import { router } from '@/router'
import { useToaster } from './composables/toaster'

import '@/assets/css/tailwind.css'
import '@/assets/css/styles.css'

import * as tf from '@tensorflow/tfjs'

import { plugin as VueTippy } from 'vue-tippy'
import 'tippy.js/dist/tippy.css' // optional for styling

tf.ready()
  .then(() => console.log(`Loaded ${tf.getBackend()} backend`))
  .catch(console.error)

// create vue app
const app = createApp(App)

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  const toaster = useToaster()
  if (err instanceof TypeError) {
    // Implementation bug
    toaster.error('Sorry, something went wrong on our side. Please reach out on slack.')
  } else {
    // Unknown error
    toaster.error('Something went wrong. Please try again later or reach out on slack.')
  }
  console.error(err, instance, info)
}

app
  .use(createPinia())
  .use(router)
  .use(VueTippy,
    {
      directive: 'tippy', // => v-tippy
      component: 'tippy', // => <tippy/>
      componentSingleton: 'tippy-singleton', // => <tippy-singleton/>,
      defaultProps: {
        theme: 'custom-dark',
        placement: 'auto-end',
        allowHTML: true,
        delay: 0,
      },
    }
  ).mount('#app')

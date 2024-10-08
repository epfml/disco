import createDebug from "debug";
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createPersistedStatePlugin } from "pinia-plugin-persistedstate-2";
import * as tf from "@tensorflow/tfjs";

import App from '@/components/App.vue'
import { router } from '@/router'
import { useToaster } from './composables/toaster'

import '@/assets/css/tailwind.css'
import '@/assets/css/styles.css'

const debug = createDebug("webapp");

import { plugin as VueTippy } from 'vue-tippy'
import 'tippy.js/dist/tippy.css' // optional for styling

tf.ready()
  .then(() => debug(`loaded TFJS' ${tf.getBackend()} backend`))
  .catch((e) => debug("while loading TFJS's backend: %o", e))

// create vue app
const app = createApp(App)

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  const toaster = useToaster()
  if (err instanceof TypeError) {
    // Implementation bug
    toaster.error('Sorry, something went wrong on our side. Please let us know via Github.')
  } else {
    // Unknown error
    toaster.error('Something went wrong. Please try again later.')
  }
  debug("%s info=%s throwed %o", err, info, instance?.$options.name)
}

app
  .use(
    createPinia().use(
      // we don't use pinia-plugin-persistedstate as it doesn't support async storage
      createPersistedStatePlugin({ persist: false }),
    ),
  )
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

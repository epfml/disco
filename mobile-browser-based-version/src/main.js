import { createApp } from 'vue'
import Vue from 'vue'
import App from './App.vue'
import router from './router'
import '@/assets/css/tailwind.css'
import Toaster from '@meforma/vue-toaster';



//Vue.use(VueNotificationRenderless);

const app = createApp(App)

app.use(Toaster).use(router).mount('#app')

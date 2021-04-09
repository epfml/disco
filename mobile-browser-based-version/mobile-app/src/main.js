import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import '@/assets/css/tailwind.css'
import Toaster from '@meforma/vue-toaster';

//Vue.use(VueNotificationRenderless);

createApp(App).use(Toaster).use(router).mount('#app')

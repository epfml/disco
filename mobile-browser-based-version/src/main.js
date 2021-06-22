import { createApp } from 'vue'
import Vue from 'vue/dist/vue.esm'
import App from './App.vue'
import router from './router'
import '@/assets/css/tailwind.css'
import Toaster from '@meforma/vue-toaster';
import Vuex from 'vuex';
import {store} from './store/store';

Vue.use(Vuex)

const app = createApp(App)

app.use(store)
app.use(Toaster).use(router).mount('#app')
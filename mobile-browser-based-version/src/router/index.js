import { createRouter, createWebHashHistory } from 'vue-router';
import { defineComponent } from 'vue';

// Some page components
import Home from '../components/Home';
import TaskList from '../components/TaskList';
import Information from '../components/Information';
import Trophee from '../components/Trophee';

var routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: TaskList,
  },
  {
    path: '/information',
    name: 'information',
    component: Information,
  },
  {
    path: '/trophee',
    name: 'trophee',
    component: Trophee,
  },
];

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes: routes,
});

export default router;

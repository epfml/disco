import { createRouter, createWebHashHistory } from 'vue-router';

// Some page components
import Home from '../components/Home';
import TaskList from '../components/TaskList';
import Information from '../components/Information';
import NotFound from '../components/NotFound';

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
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes: routes,
});

export default router;

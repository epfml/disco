import { createRouter, createWebHashHistory } from 'vue-router'

// Some page components
import Home from '@/components/pages/Home.vue'
import Information from '@/components/pages/Information.vue'
import NewTaskCreationForm from '@/components/pages/NewTaskCreationForm.vue'
import TaskList from '@/components/pages/TaskList.vue'
import ProgressBar from '@/components/navigation/ProgressBar.vue'
import Navigation from '@/components/navigation/Navigation.vue'
import NotFound from '@/components/pages/NotFound.vue'

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/create',
      name: 'new-task-form',
      component: NewTaskCreationForm
    },
    {
      path: '/information',
      name: 'information',
      component: Information
    },
    {
      path: '/list',
      name: 'task-list',
      components: {
        default: TaskList,
        ProgressBar
      }
    },
    {
      path: '/:id',
      components: {
        default: Navigation,
        ProgressBar
      },
      props: {
        default: true,
        NavigationBar: false
      }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFound
    }
  ]
})

export default router

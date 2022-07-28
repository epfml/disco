import { createRouter, createWebHashHistory } from 'vue-router'

import Home from '@/components/home/Home.vue'
import NewTaskCreationForm from '@/components/pages/NewTaskCreationForm.vue'
import TaskList from '@/components/pages/TaskList.vue'
import NotFound from '@/components/pages/NotFound.vue'
import TrainingBar from '@/components/progress_bars/TrainingBar.vue'
import InformationBar from '@/components/progress_bars/InformationBar.vue'
import Training from '@/components/training/Training.vue'
import Validation from '@/components/validation/Validation.vue'
import Information from '@/components/information/Information.vue'
import Features from '@/components/information/Features.vue'
import Tutorial from '@/components/information/Tutorial.vue'
import Further from '@/components/information/Further.vue'
import AboutUs from '@/components/pages/AboutUs.vue'

export const router = createRouter({
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
      components: {
        default: Information,
        ProgressBar: InformationBar
      }
    },
    {
      path: '/features',
      name: 'features',
      components: {
        default: Features,
        ProgressBar: InformationBar
      }
    },
    {
      path: '/tutorial',
      name: 'tutorial',
      components: {
        default: Tutorial,
        ProgressBar: InformationBar
      }
    },
    {
      path: '/further',
      name: 'further',
      components: {
        default: Further,
        ProgressBar: InformationBar
      }
    },
    {
      path: '/about',
      name: 'about',
      component: AboutUs
    },
    {
      path: '/list',
      name: 'task-list',
      components: {
        default: TaskList,
        ProgressBar: TrainingBar
      }
    },
    {
      path: '/testing',
      name: 'testing',
      component: Validation
    },
    {
      path: '/:id',
      components: {
        default: Training,
        ProgressBar: TrainingBar
      }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFound
    }
  ]
})

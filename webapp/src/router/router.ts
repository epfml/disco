import createDebug from "debug";
import { createRouter, createWebHashHistory } from 'vue-router'

import TrainingBar from '@/components/progress_bars/TrainingBar.vue'
import InformationBar from '@/components/progress_bars/InformationBar.vue'
import TestingBar from '@/components/progress_bars/TestingBar.vue'
import Home from '@/components/home/Home.vue'
import TaskCreationForm from '@/components/task_creation_form/TaskCreationForm.vue'
import TaskList from '@/components/pages/TaskList.vue'
import NotFound from '@/components/pages/NotFound.vue'
import Training from '@/components/training/TrainingSteps.vue'
import Testing from '@/components/testing/Testing.vue'
import Information from '@/components/information/Information.vue'
import Features from '@/components/information/Features.vue'
import Tutorial from '@/components/information/Tutorial.vue'
import Further from '@/components/information/Further.vue'
import AboutUs from '@/components/pages/AboutUs.vue'

const debug = createDebug("webapp:router");

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/create',
      name: 'task-creation-form',
      component: TaskCreationForm
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
      path: '/evaluate',
      name: 'evaluate',
      components: {
        default: Testing,
        ProgressBar: TestingBar
      }
    },
    {
      path: '/:id',
      components: {
        default: Training,
        ProgressBar: TrainingBar
      },
      props: {
        default: true,
        ProgressBar: false
      }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFound
    },
    {
      path: '/not-found',
      name: 'not-found',
      component: NotFound
    }
  ],
  scrollBehavior(_to, _from, _savedPosition) {
    // always scroll to top
    return { top: 0 }
  },
})

// Handle router errors
router.onError((err) => {
  // Handle the router error here
  debug("router error: %o", err);
  // Add code for reporting or other error handling logic
  void router.push({ path: '/not-found' })
})

export { router }

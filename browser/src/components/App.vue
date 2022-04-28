<template>
  <div :class="{ dark: isDark }">
    <!-- Global container for the screen -->
    <div
      class="
        flex
        h-screen
        antialiased
        text-gray-900
        bg-gray-100
        dark:bg-dark dark:text-light
      "
    >
      <!-- Sidebar -->
      <aside
        class="
          fixed
          inset-y-0
          z-10
          flex flex-shrink-0
          bg-white
          border-r
          md:static
          dark:border-primary-darker dark:bg-darker
          focus:outline-none
        "
        style="position: sticky"
      >
        <SidebarMain />
      </aside>

      <!-- Main Page -->
      <div class="overflow-x-hidden flex-grow z-0">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import SidebarMain from './sidebar/Sidebar.vue'
import TaskList from './pages/TaskList.vue'
import MainTaskFrame from './navigation/Navigation.vue'
import MainDescriptionFrame from './navigation/steps/DescriptionStep.vue'
import MainTrainingFrame from './navigation/steps/TrainingStep.vue'
import MainTestingFrame from './navigation/steps/TestingStep.vue'
import { Platform } from '../platforms/platform'
import { loadTasks } from '../tasks'

import { Task } from 'discojs'
import { mapState, mapMutations } from 'vuex'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'App',
  components: {
    SidebarMain
  },
  computed: {
    ...mapState(['isDark'])
  },
  mounted () {
    /**
       * Use IndexedDB by default if it is available.
       */
    this.setIndexedDB(!!window.indexedDB)
    /**
       * Initialize the global variable "isDark" to the
       * browser-saved theme.
       */
    this.setAppTheme(this.getBrowserTheme())
    /**
       * Initialize the app's colors to the browser-saved
       * color.
       */
    this.setAppColors(this.getBrowserColors())
    /**
       * Initialize the app to the browser-saved platform.
       */
    this.initPlatform(this.getPlatform())
  },
  async created () {
    // Load tasks and create dynamic routes
    this.routesComponents = [
      ['description', MainDescriptionFrame],
      ['training', MainTrainingFrame],
      ['testing', MainTestingFrame]
    ]
    const tasks: Task[] = await loadTasks()
    tasks.forEach((task: Task) => {
      const route = `/${task.taskID}`
      this.$router.addRoute({
        path: route,
        // So that KeepAlive can differentiate the components
        component: defineComponent({
          key: task.taskID,
          extends: MainTaskFrame
        }),
        props: {
          id: task.taskID,
          task: task
        }
      })
    })
    this.$router.addRoute({
      path: '/list',
      component: TaskList,
      props: { tasks: tasks }
    })
  },
  methods: {
    ...mapMutations(['setIndexedDB', 'setAppTheme', 'setPlatform']),
    getBrowserTheme () {
      if (window.localStorage.getItem('dark')) {
        return JSON.parse(window.localStorage.getItem('dark'))
      }
      return (
        !!window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      )
    },
    getBrowserColors () {
      return window.localStorage.getItem('color') ?? 'cyan'
    },
    setAppColors (color) {
      const root = document.documentElement
      root.style.setProperty('--color-primary', `var(--color-${color})`)
      root.style.setProperty('--color-primary-50', `var(--color-${color}-50)`)
      root.style.setProperty(
        '--color-primary-100',
        `var(--color-${color}-100)`
      )
      root.style.setProperty(
        '--color-primary-light',
        `var(--color-${color}-light)`
      )
      root.style.setProperty(
        '--color-primary-lighter',
        `var(--color-${color}-lighter)`
      )
      root.style.setProperty(
        '--color-primary-dark',
        `var(--color-${color}-dark)`
      )
      root.style.setProperty(
        '--color-primary-darker',
        `var(--color-${color}-darker)`
      )
    },
    getPlatform () {
      return window.localStorage.getItem('platform') ?? Platform.decentralized
    },
    initPlatform (platform) {
      this.setPlatform(platform)
      this.$i18n.locale = platform
    }
  }
})
</script>

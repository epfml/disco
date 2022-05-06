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
        <RouterView v-slot="{ Component }">
          <KeepAlive>
            <Component :is="Component" />
          </KeepAlive>
        </RouterView>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import SidebarMain from '@/components/sidebar/Sidebar.vue'
import TaskList from '@/components/pages/TaskList.vue'
import Navigation from '@/components/navigation/Navigation.vue'
import { loadTasks } from '@/tasks'

import { Task } from 'discojs'
import { mapState, mapMutations } from 'vuex'
import { defineComponent } from 'vue'

export default {
  name: 'App',
  components: {
    SidebarMain
  },
  data () {
    return {
      isLoading: false
    }
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
    this.initPlatform()
  },
  async created () {
    const tasks: Task[] = await loadTasks()
    tasks.forEach((task: Task) => {
      const route = `/${task.taskID}`
      this.$router.addRoute({
        path: route,
        // So that KeepAlive can differentiate the components
        component: defineComponent({
          key: task.taskID,
          extends: Navigation
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
    ...mapMutations(['setIndexedDB', 'setAppTheme']),
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
    initPlatform () {
      this.$i18n.locale = 'english'
    }
  }
}
</script>

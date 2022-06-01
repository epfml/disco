<template>
  <div
    v-if="!loading"
    :class="{ dark: isDark }"
  >
    <!-- Global container for the screen -->
    <div
      class="
        flex
        h-screen
        antialiased
        text-slate-900
        bg-slate-100
      "
    >
      <!-- Sidebar -->
      <aside
        class="
          sticky
          inset-y-0
          z-20
          flex flex-shrink-0
          bg-white
          border-r
          md:static
          focus:outline-none
        "
      >
        <SidebarMain />
      </aside>

      <!-- Main Page -->
      <BaseLayout>
        <RouterView
          v-slot="{ Component }"
          name="ProgressBar"
        >
          <KeepAlive>
            <Component :is="Component" />
          </KeepAlive>
        </RouterView>
        <RouterView v-slot="{ Component }">
          <KeepAlive>
            <Component
              :is="Component"
              :key="$route.fullPath"
            />
          </KeepAlive>
        </RouterView>
      </BaseLayout>
    </div>
  </div>
</template>

<script lang="ts">
import SidebarMain from '@/components/sidebar/Sidebar.vue'

import { mapState, mapMutations } from 'vuex'
import BaseLayout from './containers/BaseLayout.vue'

export default {
  name: 'App',
  components: {
    SidebarMain,
    BaseLayout
  },
  data (): { loading: boolean } {
    return {
      loading: true
    }
  },
  computed: {
    ...mapState(['isDark'])
  },
  async created (): Promise<void> {
    await this.$store.dispatch('initTasks')
    this.loading = false
  },
  mounted (): void {
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
     * Initialize the app to the browser-saved platform.
     */
    this.initPlatform()
  },
  methods: {
    ...mapMutations(['setIndexedDB', 'setAppTheme']),
    getBrowserTheme (): boolean {
      if (window.localStorage.getItem('dark')) {
        return JSON.parse(window.localStorage.getItem('dark'))
      }
      return (
        !!window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      )
    },
    initPlatform (): void {
      this.$i18n.locale = 'english'
    }
  }
}
</script>

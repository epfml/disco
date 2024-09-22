<template>
  <div>
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
          dark:bg-slate-800
          border-r
          md:static
          focus:outline-none
        "
      >
        <SideBar />
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
              :key="route.fullPath"
            />
          </KeepAlive>
        </RouterView>
      </BaseLayout>
    </div>
  </div>
</template>

<script lang="ts" setup>
import createDebug from "debug";
import { RouterView, useRoute } from 'vue-router'

import { useTasksStore } from '@/store/tasks'
import BaseLayout from './containers/BaseLayout.vue'
import SideBar from '@/components/sidebar/SideBar.vue'

const debug = createDebug("webapp:App");

const route = useRoute()
const tasksStore = useTasksStore()

tasksStore.initTasks().catch((e) => debug("while init tasks: %o", e));
</script>

<template>
  <div v-if="!loading">
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

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'

import { useTasksStore } from '@/store/tasks'
import { useMemoryStore } from '@/store/memory'
import BaseLayout from './containers/BaseLayout.vue'
import SidebarMain from '@/components/sidebar/Sidebar.vue'

const loading = ref(true)

const tasksStore = useTasksStore()
const memoryStore = useMemoryStore()

tasksStore.initTasks()
  .then(() => { loading.value = false })
  .catch(console.error)

onMounted(() => {
  memoryStore.setIndexedDB(!!window.indexedDB)
})

</script>

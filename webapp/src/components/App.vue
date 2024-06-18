<template>
  <div v-if="loading">
    <div class="flex flex-col h-screen w-screen justify-center items-center">
      <VueSpinner size="50" color="#6096BA"/>
      <div class="mt-10">
        <p class="text-disco-blue">Loading DISCO</p>
      </div>
    </div>
  </div>
  <div v-else>
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
import { VueSpinner } from 'vue3-spinners';

const tasksStore = useTasksStore()
const memoryStore = useMemoryStore()

const loading = ref(true)
tasksStore.initTasks()
  .then(() => { loading.value = false }) // Remove the loading indicator if even if it failed
  .catch(console.error)

onMounted(() => {
  memoryStore.setIndexedDB(!!window.indexedDB)
})

</script>

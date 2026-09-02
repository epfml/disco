<template>
  <div :class="[themeClass]">
    <!-- Global container for the screen -->
    <div
      class="flex h-screen antialiased bg-slate-100 dark:bg-slate-900 text-body-light dark:text-body-dark text-sm md:text-base"
    >
      <!-- Sidebar -->
      <aside
        class="sticky inset-y-0 z-20 flex shrink-0 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-900 md:static focus:outline-hidden"
      >
        <SideBar />
      </aside>

      <!-- Main Page -->
      <BaseLayout>
        <RouterView v-slot="{ Component }" name="ProgressBar">
          <KeepAlive>
            <Component :is="Component" />
          </KeepAlive>
        </RouterView>
        <RouterView v-slot="{ Component }">
          <KeepAlive>
            <Component :is="Component" :key="route.fullPath" />
          </KeepAlive>
        </RouterView>
      </BaseLayout>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

import { useThemeStore } from "@/store";
import BaseLayout from "./containers/BaseLayout.vue";
import SideBar from "@/components/sidebar/SideBar.vue";

const route = useRoute();
const router = useRouter();

const themeStore = useThemeStore();
const themeClass = themeStore.selectByTheme("", "dark");

// Handle GitHub Pages SPA redirect - navigate to pending route if it exists
onMounted(() => {
  const pendingRoute = sessionStorage.pendingRoute;
  if (pendingRoute) {
    delete sessionStorage.pendingRoute;
    void router.push(pendingRoute);
  }
});
</script>

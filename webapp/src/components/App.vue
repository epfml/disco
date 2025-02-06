<template>
  <div :class="[themeClass]">
    <!-- Global container for the screen -->
    <div
      class="
        flex
        h-screen
        antialiased
        bg-slate-100
        dark:bg-slate-900
        text-body-light
        dark:text-body-dark
        text-sm md:text-base
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
          dark:border-slate-900
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
import { RouterView, useRoute } from "vue-router";

import { useThemeStore } from "@/store";
import BaseLayout from "./containers/BaseLayout.vue";
import SideBar from "@/components/sidebar/SideBar.vue";

const route = useRoute();

const themeStore = useThemeStore();
const themeClass = themeStore.selectByTheme("", "dark");
</script>

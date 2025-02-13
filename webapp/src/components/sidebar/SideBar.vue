<template>
  <div>
    <!-- Mini Sidebar (LHS) -->
    <nav
      class="flex flex-col flex-shrink-0 h-full sm:px-4 px-2 py-4 border-r dark:border-black"
    >
      <!-- Brand -->
      <div class="hidden sm:flex flex-shrink-0">
        <RouterLink
          to="/"
          class="inline-block text-2xl font-bold font-disco tracking-wider cursor-pointer"
        >
          <DISCO />
        </RouterLink>
      </div>

      <!-- Mini Sidebar content-->
      <div class="flex flex-col items-center justify-center flex-1 space-y-4">
        <SidebarButton text="Home"> 
          <RouterLink to="/">
            <HomeIcon />
          </RouterLink>
        </SidebarButton>
        <SidebarButton text="DISCOllaboratives"> 
          <RouterLink to="/list">
            <TasksIcon class="w-6 h-6" />
          </RouterLink>
        </SidebarButton>
        <SidebarButton text="Create a new DISCOllaborative"> 
          <RouterLink to="/create">
            <CreateIcon />
          </RouterLink>
        </SidebarButton>
        <SidebarButton text="Evaluate models"> 
          <RouterLink to="/evaluate">
            <EvaluateIcon />
          </RouterLink>
        </SidebarButton>

        <SidebarButton
          :text="
            themeStore.current === 'light'
              ? 'Switch to Dark Mode'
              : 'Switch to Light Mode'
          "
          @click="toggleDarkMode"
        >
          <MoonIcon v-if="themeStore.current === 'light'" />
          <SunIcon v-else />
        </SidebarButton>
      </div>
    </nav>
  </div>
</template>
<script setup lang="ts">
import { RouterLink } from "vue-router";

import HomeIcon from "@/assets/svg/HomeIcon.vue";
import TasksIcon from "@/assets/svg/TasksIcon.vue";
import CreateIcon from "@/assets/svg/CreateIcon.vue";
import EvaluateIcon from "@/assets/svg/EvaluateIcon.vue";
import DISCO from "@/components/simple/DISCO.vue";

import SidebarButton from "./SidebarButton.vue";
import MoonIcon from "@/assets/svg/MoonIcon.vue";
import SunIcon from "@/assets/svg/SunIcon.vue";
import { useThemeStore } from "@/store";

const themeStore = useThemeStore();
// Function to toggle the dark mode
const toggleDarkMode = () => {
  themeStore.current = (themeStore.current === "light") ? "dark" : "light";
};
</script>

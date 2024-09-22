<template>
  <div>
    <!-- Mini Sidebar (LHS) -->
    <nav class="flex flex-col flex-shrink-0 h-full sm:px-4 px-2 py-4 border-r">
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
        <SidebarButton to="/" text="Home"> <HomeIcon /> </SidebarButton>

        <SidebarButton to="/list" text="DISCOllaboratives">
          <TasksIcon class="w-6 h-6" />
        </SidebarButton>

        <SidebarButton to="/create" text="Create a new DISCOllaborative">
          <CreateIcon />
        </SidebarButton>

        <SidebarButton to="/evaluate" text="Evaluate models">
          <EvaluateIcon />
        </SidebarButton>

        <SidebarButton to="/information" text="More on DISCO">
          <InfoIcon />
        </SidebarButton>

        <SidebarButton 
          to="" 
          :text="currentTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'" 
          @click="toggleDarkMode"
        >
          
          <MoonIcon v-if="currentTheme === 'light'"/>
          <SunIcon v-else/>
        </SidebarButton>
      </div>
    </nav>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from "vue-router";

import HomeIcon from "@/assets/svg/HomeIcon.vue";
import TasksIcon from "@/assets/svg/TasksIcon.vue";
import CreateIcon from "@/assets/svg/CreateIcon.vue";
import EvaluateIcon from "@/assets/svg/EvaluateIcon.vue";
import InfoIcon from "@/assets/svg/InfoIcon.vue";
import DISCO from "@/components/simple/DISCO.vue";

import SidebarButton from "./SidebarButton.vue";
import MoonIcon from "@/assets/svg/MoonIcon.vue";
import SunIcon from "@/assets/svg/SunIcon.vue";

const currentTheme = ref(localStorage.getItem('theme') || 'light');

// Apply the initial theme on mount
onMounted(() => {
  if (currentTheme.value === 'dark') {
    document.documentElement.classList.add('dark');
  }
});
// Function to toggle the dark mode
const toggleDarkMode = () => {
  const newTheme = currentTheme.value === 'light' ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', newTheme === 'dark');
  localStorage.setItem('theme', newTheme);
  currentTheme.value = newTheme;
};


</script>

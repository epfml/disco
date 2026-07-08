<template>
  <div>
    <!-- Mini Sidebar (LHS) -->
    <nav class="flex flex-col shrink-0 h-full sm:px-4 px-2 py-4">
      <!-- Brand -->
      <div class="hidden sm:flex shrink-0">
        <RouterLink
          to="/"
          class="inline-block text-2xl font-bold font-disco tracking-wider cursor-pointer"
        >
          <DISCO />
        </RouterLink>
      </div>

      <!-- Mini Sidebar content-->
      <div class="flex flex-col items-center justify-center flex-1 space-y-4">
        <RouterLink to="/">
          <SidebarButton id="tuto-home-bttn" text="Home" label="Home">
            <HomeIcon />
          </SidebarButton>
        </RouterLink>
        <RouterLink to="/list">
          <SidebarButton text="Join existing DISCOllaboratives" label="Join">
            <TasksIcon class="w-6 h-6" />
          </SidebarButton>
        </RouterLink>
        <RouterLink to="/create">
          <SidebarButton
            id="tuto-create-bttn"
            text="Create a new DISCOllaborative"
            label="Create"
          >
            <CreateIcon />
          </SidebarButton>
        </RouterLink>
        <RouterLink to="/evaluate">
          <SidebarButton
            id="tuto-evaluate-bttn"
            text="Evaluate or download a model in the Model Library"
            label="Models"
          >
            <EvaluateIcon />
          </SidebarButton>
        </RouterLink>
      </div>
      <div class="flex flex-col justify-center space-y-4 items-center">
        <SidebarButton
          :text="
            themeStore.current === 'light'
              ? 'Switch to Dark Mode'
              : 'Switch to Light Mode'
          "
          label="Theme"
          @click="toggleDarkMode"
        >
          <MoonIcon v-if="themeStore.current === 'light'" />
          <SunIcon v-else />
        </SidebarButton>
        <SidebarButton
          id="tuto-help-bttn"
          text="Check out the tutorial"
          label="Tutorial"
          @click="tutorialStore.startFromSidebar"
        >
          <QuestionMarkIcon />
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
import QuestionMarkIcon from "@/assets/svg/QuestionMarkIcon.vue";
import DISCO from "@/components/simple/DISCO.vue";

import SidebarButton from "./SidebarButton.vue";
import MoonIcon from "@/assets/svg/MoonIcon.vue";
import SunIcon from "@/assets/svg/SunIcon.vue";

import { useThemeStore } from "@/store";
import { useTutorialStore } from "@/store";

const themeStore = useThemeStore();
const tutorialStore = useTutorialStore();

// Function to toggle the dark mode
const toggleDarkMode = () => {
  themeStore.current = themeStore.current === "light" ? "dark" : "light";
};
</script>

<template>
  <div>
    <!-- Mini Sidebar (LHS) -->
    <nav
      class="
      flex flex-col flex-shrink-0
      h-full
      sm:px-4
      px-2
      py-4
      border-r
      "
    >
      <!-- Brand -->
      <div class="hidden sm:flex flex-shrink-0">
        <a
          class="
          inline-block
          text-2xl
          font-bold
          font-disco
          tracking-wider
          cursor-pointer
        "
          @click="goToHome"
        >
        <DISCO />
        </a>
      </div>
      <!-- Mini Sidebar content-->
      <div class="flex flex-col items-center justify-center flex-1 space-y-4">
        <!-- Go to Home page -->
        <!-- Active classes "bg-primary text-white" -->
        <!-- inActive classes "bg-primary-50 text-primary-lighter" -->
        <SidebarButton
          hover-text="home"
          @click="goToHome()"
        >
          <HomeIcon />
        </SidebarButton>
        <!-- Go to Task List page -->
        <SidebarButton
          hover-text="DISCOllaboratives"
          @click="goToTaskList()"
        >
          <TasksIcon customClass="w-6 h-6"/>
        </SidebarButton>
        <!-- Go to custom task creation page -->
        <SidebarButton
          hover-text="Create a new DISCOllaborative"
          @click="goToNewCustomTask()"
        >
          <CreateIcon />
        </SidebarButton>
        <!-- Go to model evaluation page -->
        <SidebarButton
          hover-text="Evaluate models"
          @click="goToEvaluate()"
        >
          <EvaluateIcon />
        </SidebarButton>
        <!-- Go to Information page -->
        <SidebarButton
          hover-text="More on DISCO"
          @click="goToInformation()"
        >
          <InfoIcon />
        </SidebarButton>
      </div>
    </nav>
  </div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'

import SidebarButton from './containers/SidebarButton.vue'
import HomeIcon from '@/assets/svg/HomeIcon.vue'
import TasksIcon from '@/assets/svg/TasksIcon.vue'
import CreateIcon from '@/assets/svg/CreateIcon.vue'
import EvaluateIcon from '@/assets/svg/EvaluateIcon.vue'
import InfoIcon from '@/assets/svg/InfoIcon.vue'
import DISCO from '@/components/simple/DISCO.vue'

import { useValidationStore } from '@/store/validation'

const router = useRouter()

const validationStore = useValidationStore()

function goToHome () {
  router.push({ path: '/' })
}

function goToTaskList () {
  router.push({ path: '/list' })
}

function goToNewCustomTask () {
  router.push({ path: '/create' })
}

function goToEvaluate () {
  // Reset the store
  validationStore.step = 0
  validationStore.modelID = undefined;
  validationStore.mode = undefined;

  router.push({ path: '/evaluate' })
}

function goToInformation () {
  router.push({ path: '/information' })
}

</script>

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
        <!-- Display Model Library panel -->
        <SidebarButton
          id="model-library-btn"
          hover-text="Model Library"
          @click="openModelLibrary()"
        >
          <FileIcon />
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

    <!-- Menu (RHS)  currently only contains the model library but can be expanded with more -->
    <div class="absolute">
      <!-- Backdrop -->
      <Transition
        enter-class="transition duration-300 ease-in-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-class="transition duration-300 ease-in-out"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-show="isMenuOpen"
          class="transform fixed inset-0 z-10 bg-slate-500"
          style="opacity: 0.5"
          aria-hidden="true"
          @click="closeMenu()"
        />
      </Transition>

      <!-- Panel -->
      <Transition
        enter-active-class="transition duration-300 ease-in-out sm:duration-500"
        enter-from-class="translate-x-full"
        enter-class="translate-x-0"
        leave-active-class="transition duration-300 ease-in-out sm:duration-500"
        leave-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <section
          v-show="isMenuOpen"
          x-ref="panel"
          tabindex="-1"
          class="
          transform
          fixed
          inset-y-0
          right-0
          z-20
          w-full
          max-w-xs
          bg-white
          shadow-xl
          sm:max-w-md
          focus:outline-none
        "
          aria-labelledby="panelLabel"
        >
          <!-- Close button -->
          <div class="absolute left-0 p-2 transform -translate-x-full">
            <button
              class="p-2 text-white rounded-md focus:outline-none"
              @click="closeMenu()"
            >
              <CrossIcon />
            </button>
          </div>
          <!-- Panel content -->
          <ModelLibrary
            @close-panel="closeMenu()"
          />
        </section>
      </Transition>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import ModelLibrary from './ModelLibrary.vue'
import SidebarButton from './containers/SidebarButton.vue'
import HomeIcon from '@/assets/svg/HomeIcon.vue'
import TasksIcon from '@/assets/svg/TasksIcon.vue'
import CreateIcon from '@/assets/svg/CreateIcon.vue'
import EvaluateIcon from '@/assets/svg/EvaluateIcon.vue'
import InfoIcon from '@/assets/svg/InfoIcon.vue'
import FileIcon from '@/assets/svg/FileIcon.vue'
import CrossIcon from '@/assets/svg/CrossIcon.vue'
import DISCO from '@/components/simple/DISCO.vue'

import { useValidationStore } from '@/store/validation'

const isMenuOpen = ref(false)
const router = useRouter()

const validationStore = useValidationStore()


function openModelLibrary() {
  isMenuOpen.value = true
}

function closeMenu () {
  isMenuOpen.value = false
}

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
  validationStore.model = undefined;
  router.push({ path: '/evaluate' })
}

function goToInformation () {
  router.push({ path: '/information' })
}

</script>

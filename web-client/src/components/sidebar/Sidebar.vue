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
          <span
            class="text-disco-cyan"
          >DIS</span><span
            class="text-disco-blue"
          >CO</span>
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
          <ListIcon />
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

    <!-- Menu (RHS) -->
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
            v-if="isModelLibraryOpen"
            @close-panel="closeMenu()"
          />
        </section>
      </Transition>
    </div>
  </div>
</template>
<script lang="ts">
import type { Instance, Props, Placement } from 'tippy.js'
import tippy from 'tippy.js'

import ModelLibrary from './ModelLibrary.vue'
import SidebarButton from './containers/SidebarButton.vue'
import HomeIcon from '@/assets/svg/HomeIcon.vue'
import ListIcon from '@/assets/svg/ListIcon.vue'
import CreateIcon from '@/assets/svg/CreateIcon.vue'
import EvaluateIcon from '@/assets/svg/EvaluateIcon.vue'
import InfoIcon from '@/assets/svg/InfoIcon.vue'
import FileIcon from '@/assets/svg/FileIcon.vue'
import CrossIcon from '@/assets/svg/CrossIcon.vue'
import AboutUsIcon from '@/assets/svg/AboutUsIcon.vue'

export default {
  name: 'SidebarMain',
  components: {
    ModelLibrary,
    HomeIcon,
    CreateIcon,
    EvaluateIcon,
    FileIcon,
    InfoIcon,
    ListIcon,
    CrossIcon,
    AboutUsIcon,
    SidebarButton
  },
  data () {
    return {
      loading: false,
      isMenuOpen: false,
      isModelLibraryOpen: false
    }
  },
  async mounted () {
    tippy('a', {
      theme: 'custom-dark',
      delay: 0,
      duration: 0,
      content: (reference: Element) => reference.getAttribute('data-title') as string,
      onMount: (instance: Instance<Props>) => {
        instance.popperInstance?.setOptions({
          placement: instance.reference.getAttribute('data-placement') as Placement
        })
      }
    })
  },
  methods: {
    openModelLibrary () {
      this.isMenuOpen = true
      this.isModelLibraryOpen = true
    },
    closeMenu () {
      this.isMenuOpen = false
      this.isModelLibraryOpen = false
    },
    goToHome () {
      this.$router.push({ path: '/' })
    },
    goToTaskList () {
      this.$router.push({ path: '/list' })
    },
    goToNewCustomTask () {
      this.$router.push({ path: '/create' })
    },
    goToEvaluate () {
      this.$router.push({ path: '/evaluate' })
    },
    goToInformation () {
      this.$router.push({ path: '/information' })
    },
    goToAboutUs () {
      this.$router.push({ path: '/about' })
    }
  }
}
</script>

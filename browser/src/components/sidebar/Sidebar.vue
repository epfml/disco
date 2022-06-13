<template>
  <div>
    <!-- Mini Sidebar (LHS) -->
    <nav
      class="
      flex flex-col flex-shrink-0
      h-full
      px-2
      py-4
      border-r
      dark:border-primary-darker
    "
    >
      <!-- Brand -->
      <div class="flex-shrink-0">
        <a
          class="
          p-1
          inline-block
          text-xl
          font-bold
          tracking-wider
        "
          @click="goToHome"
        >
          <span class="text-disco-cyan">DIS</span><span class="text-disco-blue">CO</span>
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
          hover-text="tasks"
          @click="goToTaskList()"
        >
          <ListIcon />
        </SidebarButton>
        <!-- Display Model Library panel -->
        <SidebarButton
          hover-text="models"
          @click="openModelLibrary()"
        >
          <FileIcon />
        </SidebarButton>
        <!-- Go to Information page -->
        <SidebarButton
          hover-text="information"
          @click="goToInformation()"
        >
          <InfoIcon />
        </SidebarButton>
        <!-- Display Settings panel-->
        <SidebarButton
          hover-text="settings"
          @click="openSettingsPanel()"
        >
          <SettingsIcon />
        </SidebarButton>
        <!-- Go to About Us page -->
        <SidebarButton
          hover-text="about us"
          @click="goToAboutUs()"
        >
          <AboutUsIcon />
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
          class="transform fixed inset-0 z-10 bg-primary-darker"
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
          dark:bg-darker dark:text-light
          sm:max-w-md
          focus:outline-none
        "
          aria-labelledby="panelLabel"
        >
          <!-- Close button -->
          <div class="absolute left-0 p-2 transform -translate-x-full">
            <button
              class="p-2 text-white rounded-md focus:outline-none focus:ring"
              @click="closeMenu()"
            >
              <CrossIcon />
            </button>
          </div>
          <!-- Panel content -->
          <Settings v-if="isSettingsPanelOpen" />
          <ModelLibrary
            v-else-if="isModelLibraryOpen"
            @switch-panel="switchFromModelLibraryToSettings()"
          />
        </section>
      </Transition>
    </div>
  </div>
</template>
<script lang="ts">
import Settings from './Settings.vue'
import ModelLibrary from './ModelLibrary.vue'
import tippy from 'tippy.js'
import HomeIcon from '@/assets/svg/HomeIcon.vue'
import ListIcon from '@/assets/svg/ListIcon.vue'
import InfoIcon from '@/assets/svg/InfoIcon.vue'
import FileIcon from '@/assets/svg/FileIcon.vue'
import SettingsIcon from '@/assets/svg/SettingsIcon.vue'
import CrossIcon from '@/assets/svg/CrossIcon.vue'
import AboutUsIcon from '@/assets/svg/AboutUsIcon.vue'
import SidebarButton from './containers/SidebarButton.vue'

export default {
  name: 'SidebarMain',
  components: {
    Settings,
    ModelLibrary,
    HomeIcon,
    FileIcon,
    InfoIcon,
    SettingsIcon,
    ListIcon,
    CrossIcon,
    AboutUsIcon,
    SidebarButton
  },
  data () {
    return {
      loading: false,
      isMenuOpen: false,
      isSettingsPanelOpen: false,
      isModelLibraryOpen: false
    }
  },
  async mounted () {
    tippy('a', {
      theme: 'custom-dark',
      delay: 0,
      duration: 0,
      content: (reference) => reference.getAttribute('data-title'),
      onMount (instance) {
        instance.popperInstance.setOptions({
          placement: instance.reference.getAttribute('data-placement') as any
        })
      }
    })
  },
  methods: {
    switchFromModelLibraryToSettings () {
      this.isModeLibraryOpen = false
      this.isSettingsPanelOpen = true
    },
    openModelLibrary () {
      this.isMenuOpen = true
      this.isModelLibraryOpen = true
    },
    openSettingsPanel () {
      this.isMenuOpen = true
      this.isSettingsPanelOpen = true
    },
    closeMenu () {
      this.isMenuOpen = false
      this.isSettingsPanelOpen = false
      this.isModelLibraryOpen = false
    },
    goToHome () {
      this.$router.push({ path: '/' })
    },
    goToTaskList () {
      this.$router.push({ path: '/list' })
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

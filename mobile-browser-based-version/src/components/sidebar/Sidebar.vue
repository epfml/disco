<template>
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
        v-on:click="goToHome"
        class="
          p-1
          inline-block
          text-xl
          font-bold
          tracking-wider
          text-primary-dark
          dark:text-light
        "
      >
        {{ $t("home.title.name") }}
      </a>
    </div>

    <!-- Mini Sidebar content-->
    <div class="flex flex-col items-center justify-center flex-1 space-y-4">
      <!-- Go to Home page -->
      <!-- Active classes "bg-primary text-white" -->
      <!-- inActive classes "bg-primary-50 text-primary-lighter" -->
      <SidebarButton v-on:click="goToHome" hoverText="home" :activePage="activePage">
        <home-icon />
      </SidebarButton>
      <!-- Go to Task List page -->
      <a
        type="a"
        data-title="Tasks"
        data-placement="right"
        v-on:click="goToTaskList()"
        class="
          p-2
          transition-colors
          duration-200
          rounded-full
          hover:text-primary hover:bg-primary-100
          dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark
          focus:outline-none focus:bg-primary-100
          dark:focus:bg-primary-dark
          focus:ring-primary-darker
        "
        v-bind:class="[
          this.activePage === 'tasks' ? 'bg-primary' : 'bg-primary-50',
          this.activePage === 'tasks' ? 'text-white' : 'text-primary-lighter',
        ]"
      >
        <span class="sr-only">Task List</span>
        <list-icon />
      </a>

      <!-- Display Model Library panel -->
      <a
        type="a"
        data-title="Models"
        data-placement="right"
        v-on:click="openModelLibrary()"
        class="
          p-2
          text-primary-lighter
          transition-colors
          duration-200
          rounded-full
          bg-primary-50
          hover:text-primary hover:bg-primary-100
          dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark
          focus:outline-none focus:bg-primary-100
          dark:focus:bg-primary-dark
          focus:ring-primary-darker
        "
      >
        <span class="sr-only">Open Model Library</span>
        <file-icon />
      </a>

      <!-- Go to Information page -->
      <!-- Active classes "bg-primary text-white" -->
      <!-- inActive classes "bg-primary-50 text-primary-lighter" -->
      <a
        type="a"
        data-title="Information"
        data-placement="right"
        v-on:click="goToInformation()"
        class="
          p-2
          transition-colors
          duration-200
          rounded-full
          hover:text-primary hover:bg-primary-100
          dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark
          focus:outline-none focus:bg-primary-100
          dark:focus:bg-primary-dark
          focus:ring-primary-darker
        "
        v-bind:class="[
          this.activePage === 'info' ? 'bg-primary' : 'bg-primary-50',
          this.activePage === 'info' ? 'text-white' : 'text-primary-lighter',
        ]"
      >
        <span class="sr-only">Messages</span>
        <info-icon />
      </a>

      <!-- Display Settings panel-->
      <a
        type="a"
        data-title="Settings"
        data-placement="right"
        v-on:click="openSettingsPanel()"
        class="
          p-2
          transition-colors
          duration-200
          rounded-full
          text-primary-lighter
          bg-primary-50
          hover:text-primary hover:bg-primary-100
          dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark
          focus:outline-none focus:bg-primary-100
          dark:focus:bg-primary-dark
          focus:ring-primary-darker
        "
      >
        <span class="sr-only">Open Settings Panel</span>
        <settings-icon />
      </a>
    </div>
  </nav>

  <!-- Menu (RHS) -->
  <div class="absolute">
    <!-- Backdrop -->
    <transition
      enter-class="transition duration-300 ease-in-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-class="transition duration-300 ease-in-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-show="isMenuOpen"
        v-on:click="closeMenu()"
        class="transform fixed inset-0 z-10 bg-primary-darker"
        style="opacity: 0.5"
        aria-hidden="true"
      ></div>
    </transition>

    <!-- Panel -->
    <transition
      enter-active-class="transition duration-300 ease-in-out sm:duration-500"
      enter-from-class="translate-x-full"
      enter-class="translate-x-0"
      leave-active-class="transition duration-300 ease-in-out sm:duration-500"
      leave-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <section
        x-ref="panel"
        tabindex="-1"
        v-show="isMenuOpen"
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
            v-on:click="closeMenu()"
            class="p-2 text-white rounded-md focus:outline-none focus:ring"
          >
            <svg
              class="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <!-- Panel content -->
        <settings v-if="isSettingsPanelOpen" />
        <model-library
          v-else-if="isModelLibraryOpen"
          v-on:switch-panel="switchFromModelLibraryToSettings()"
        />
      </section>
    </transition>
  </div>
</template>
<script>
import Settings from "./Settings.vue";
import ModelLibrary from "./ModelLibrary.vue";
import tippy from "tippy.js";
import { mapState, mapMutations } from "vuex";
import HomeIcon from "../../assets/svg/HomeIcon.vue";
import ListIcon from "../../assets/svg/ListIcon.vue";
import InfoIcon from "../../assets/svg/InfoIcon.vue";
import FileIcon from "../../assets/svg/FileIcon.vue";
import SettingsIcon from "../../assets/svg/SettingsIcon.vue";
import SidebarButton from "./containers/SidebarButton.vue";
export default {
  name: "Sidebar",
  components: {
    Settings,
    ModelLibrary,
    HomeIcon,
    FileIcon,
    InfoIcon,
    SettingsIcon,
    ListIcon,
    SidebarButton,
  },
  data() {
    return {
      loading: false,
      isMenuOpen: false,
      isSettingsPanelOpen: false,
      isModelLibraryOpen: false,
    };
  },
  computed: {
    ...mapState(["activePage"]),
  },
  methods: {
    ...mapMutations(["setActivePage"]),
    switchFromModelLibraryToSettings() {
      this.isModeLibraryOpen = false;
      this.isSettingsPanelOpen = true;
    },
    openModelLibrary() {
      this.isMenuOpen = true;
      this.isModelLibraryOpen = true;
    },
    openSettingsPanel() {
      this.isMenuOpen = true;
      this.isSettingsPanelOpen = true;
    },
    closeMenu() {
      this.isMenuOpen = false;
      this.isSettingsPanelOpen = false;
      this.isModelLibraryOpen = false;
    },
    goToHome() {
      console.log("***********************");
      this.setActivePage("home");
      this.$router.push({ name: "home" });
    },
    goToTaskList() {
      this.setActivePage("tasks");
      this.$router.push({ name: "tasks" });
    },
    goToInformation() {
      this.setActivePage("info");
      this.$router.push({ name: "information" });
    },
  },
  async mounted() {
    tippy("a", {
      theme: "custom-dark",
      delay: 0,
      duration: 0,
      content: (reference) => reference.getAttribute("data-title"),
      onMount(instance) {
        instance.popperInstance.setOptions({
          placement: instance.reference.getAttribute("data-placement"),
        });
      },
    });
  },
};
</script>

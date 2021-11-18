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
        v-on:click="goToHome()"
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
        FeAI
      </a>
    </div>

    <!-- Mini Sidebar content-->
    <div class="flex flex-col items-center justify-center flex-1 space-y-4">
      <!-- Go to Home page -->
      <!-- Active classes "bg-primary text-white" -->
      <!-- inActive classes "bg-primary-50 text-primary-lighter" -->
      <a
        v-on:click="goToHome()"
        type="a"
        data-title="Home"
        data-placement="right"
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
          this.activePage === 'home' ? 'bg-primary' : 'bg-primary-50',
          this.activePage === 'home' ? 'text-white' : 'text-primary-lighter',
        ]"
      >
        <span class="sr-only">Home</span>
        <svg
          class="w-7 h-7"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      </a>

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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-6 h-6"
          fill="none"
          viewBox="0 0 16 16"
          stroke="currentColor"
        >
          <path
            stroke-width="1"
            d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"
          />
          <path
            stroke-width="0.5"
            d="M5 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 5 8zm0-2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-1-5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zM4 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm0 2.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"
          />
        </svg>
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
        <svg
          class="w-6 h-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 16 16"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4H2.19zm4.69-1.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707z"
          />
        </svg>
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          class="bi bi-info-circlew-7 h-7"
          viewBox="0 0 16 16"
        >
          <path
            d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
          />
          <path
            d="M8.93 6.588l-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"
          />
        </svg>
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
        <svg
          class="w-7 h-7"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
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
import Settings from './Settings.vue';
import ModelLibrary from './ModelLibrary.vue';
import tippy from 'tippy.js';
import { mapState, mapMutations } from 'vuex';

export default {
  name: 'Sidebar',
  components: {
    Settings,
    ModelLibrary,
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
    ...mapState(['activePage']),
  },
  methods: {
    ...mapMutations(['setActivePage']),
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
      this.setActivePage('home');
      this.$router.push({ name: 'home' });
    },
    goToTaskList() {
      this.setActivePage('tasks');
      this.$router.push({ name: 'tasks' });
    },
    goToInformation() {
      this.setActivePage('info');
      this.$router.push({ name: 'information' });
    },
  },
  async mounted() {
    tippy('a', {
      theme: 'custom-dark',
      delay: 0,
      duration: 0,
      content: (reference) => reference.getAttribute('data-title'),
      onMount(instance) {
        instance.popperInstance.setOptions({
          placement: instance.reference.getAttribute('data-placement'),
        });
      },
    });
  },
};
</script>

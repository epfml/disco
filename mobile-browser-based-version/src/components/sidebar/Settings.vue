<template>
  <!-- Panel content -->
  <div class="flex flex-col h-screen">
    <!-- Panel header -->
    <div
      class="
        flex flex-col
        items-center
        justify-center
        flex-shrink-0
        px-4
        py-8
        space-y-4
        border-b
        dark:border-primary-dark
      "
    >
      <span class="text-gray-500 dark:text-primary">
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
      </span>
      <h2
        id="settinsPanelLabel"
        class="text-xl font-medium text-gray-500 dark:text-light"
      >
        Settings
      </h2>
    </div>
    <!-- Content -->
    <!-- Platform -->
    <div class="p-4 space-y-4 md:p-8">
      <h6 class="text-lg font-medium text-gray-400 dark:text-light">
        Platform
      </h6>
      <div class="flex items-center space-x-8">
        <!-- Decentralized button -->
        <button
          v-on:click="setDecentralized"
          class="
            flex
            items-center
            justify-center
            px-4
            py-2
            space-x-4
            transition-colors
            border
            rounded-md
            hover:text-gray-900 hover:border-gray-900
            dark:border-primary
            dark:hover:text-primary-100
            dark:hover:border-primary-light
            focus:outline-none
            focus:ring
            focus:ring-primary-lighter
            focus:ring-offset-2
            dark:focus:ring-offset-dark dark:focus:ring-primary-dark
          "
          :class="{
            'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100':
              isDecentralized,
            'text-gray-500 dark:text-primary-light': !isDecentralized,
          }"
        >
          <span>
            <svg
              class="w-6 h-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </span>
          <span>Decentralized</span>
        </button>

        <!-- Federated button -->
        <button
          v-on:click="setFederated"
          class="
            flex
            items-center
            justify-center
            px-4
            py-2
            space-x-4
            transition-colors
            border
            rounded-md
            hover:text-gray-900 hover:border-gray-900
            dark:border-primary
            dark:hover:text-primary-100
            dark:hover:border-primary-light
            focus:outline-none
            focus:ring
            focus:ring-primary-lighter
            focus:ring-offset-2
            dark:focus:ring-offset-dark dark:focus:ring-primary-dark
          "
          :class="{
            'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100':
              isFederated,
            'text-gray-500 dark:text-primary-light': !isFederated,
          }"
        >
          <span>
            <svg
              class="w-6 h-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </span>
          <span>Federated</span>
        </button>
      </div>
    </div>
    <div class="overflow-hidden hover:overflow-y-auto">
      <!-- IndexedDB -->
      <div class="p-4 space-y-4 md:p-8">
        <h6 class="text-lg font-medium text-gray-400 dark:text-light">
          Model library
        </h6>
        <span class="text-s">
          Turn on to get storage options for your trained models. This uses your
          browser's own database, namely
          <button class="text-blue-600">
            <a
              href="https://en.wikipedia.org/wiki/Indexed_Database_API"
              target="_blank"
            >
              IndexedDB</a
            ></button
          >.<br />
        </span>
        <div class="flex items-center justify-center">
          <button
            class="
              flex
              items-center
              justify-center
              px-4
              py-4
              space-x-4
              transition-colors
              border
              rounded-md
              hover:text-gray-900 hover:border-gray-900
              dark:border-primary
              dark:hover:text-primary-100
              dark:hover:border-primary-light
              focus:outline-none
              focus:ring
              focus:ring-primary-lighter
              focus:ring-offset-2
              dark:focus:ring-offset-dark dark:focus:ring-primary-dark
            "
            v-on:click="toggleIndexedDB()"
          >
            <span class="text-s"> Use model library </span>
            <div class="relative focus:outline-none">
              <div
                class="
                  w-12
                  h-6
                  transition
                  rounded-full
                  outline-none
                  bg-primary-100
                  dark:bg-primary-darker
                "
              ></div>
              <div
                class="
                  absolute
                  top-0
                  left-0
                  inline-flex
                  w-6
                  h-6
                  transition-all
                  duration-200
                  ease-in-out
                  transform
                  scale-110
                  rounded-full
                  shadow-sm
                "
                :class="{
                  'translate-x-0 bg-white dark:bg-primary-100': !useIndexedDB,
                  'translate-x-6 bg-primary-light dark:bg-primary':
                    useIndexedDB,
                }"
              ></div>
            </div>
          </button>
        </div>
      </div>
      <!-- Theme -->
      <div class="p-4 space-y-4 md:p-8">
        <h6 class="text-lg font-medium text-gray-400 dark:text-light">
          Theme mode
        </h6>
        <div class="flex items-center justify-center space-x-8">
          <!-- Light button -->
          <button
            v-on:click="setLightTheme"
            class="
              flex
              items-center
              justify-center
              px-4
              py-2
              space-x-4
              transition-colors
              border
              rounded-md
              hover:text-gray-900 hover:border-gray-900
              dark:border-primary
              dark:hover:text-primary-100
              dark:hover:border-primary-light
              focus:outline-none
              focus:ring
              focus:ring-primary-lighter
              focus:ring-offset-2
              dark:focus:ring-offset-dark dark:focus:ring-primary-dark
            "
            :class="{
              'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100':
                !isDark,
              'text-gray-500 dark:text-primary-light': isDark,
            }"
          >
            <span>
              <svg
                class="w-6 h-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </span>
            <span>Light</span>
          </button>

          <!-- Dark button -->
          <button
            v-on:click="setDarkTheme"
            class="
              flex
              items-center
              justify-center
              px-4
              py-2
              space-x-4
              transition-colors
              border
              rounded-md
              hover:text-gray-900 hover:border-gray-900
              dark:border-primary
              dark:hover:text-primary-100
              dark:hover:border-primary-light
              focus:outline-none
              focus:ring
              focus:ring-primary-lighter
              focus:ring-offset-2
              dark:focus:ring-offset-dark dark:focus:ring-primary-dark
            "
            :class="{
              'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100':
                isDark,
              'text-gray-500 dark:text-primary-light': !isDark,
            }"
          >
            <span>
              <svg
                class="w-6 h-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            </span>
            <span>Dark</span>
          </button>
        </div>
      </div>

      <!-- Colors -->
      <div class="p-4 space-y-4 md:p-8">
        <h6 class="text-lg font-medium text-gray-400 dark:text-light">
          Secondary colors
        </h6>
        <div class="flex justify-center">
          <button
            v-on:click="setColors('cyan')"
            class="w-10 h-10 rounded-full"
            style="background-color: var(--color-cyan)"
          ></button>
          <button
            v-on:click="setColors('teal')"
            class="w-10 h-10 rounded-full"
            style="background-color: var(--color-teal)"
          ></button>
          <button
            v-on:click="setColors('green')"
            class="w-10 h-10 rounded-full"
            style="background-color: var(--color-green)"
          ></button>
          <button
            v-on:click="setColors('fuchsia')"
            class="w-10 h-10 rounded-full"
            style="background-color: var(--color-fuchsia)"
          ></button>
          <button
            v-on:click="setColors('blue')"
            class="w-10 h-10 rounded-full"
            style="background-color: var(--color-blue)"
          ></button>
          <button
            v-on:click="setColors('violet')"
            class="w-10 h-10 rounded-full"
            style="background-color: var(--color-violet)"
          ></button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { mapState, mapMutations } from 'vuex';

export default {
  name: 'settings',
  computed: {
    ...mapState(['useIndexedDB', 'isDark']),
    isDecentralized() {
      return this.$i18n.locale === 'de';
    },
    isFederated() {
      return this.$i18n.locale === 'fe';
    },
  },
  methods: {
    ...mapMutations(['setIndexedDB', 'setAppTheme']),
    toggleIndexedDB() {
      this.setIndexedDB(!this.useIndexedDB && window.indexedDB);
    },
    setAppColors(color) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', `var(--color-${color})`);
      root.style.setProperty('--color-primary-50', `var(--color-${color}-50)`);
      root.style.setProperty(
        '--color-primary-100',
        `var(--color-${color}-100)`
      );
      root.style.setProperty(
        '--color-primary-light',
        `var(--color-${color}-light)`
      );
      root.style.setProperty(
        '--color-primary-lighter',
        `var(--color-${color}-lighter)`
      );
      root.style.setProperty(
        '--color-primary-dark',
        `var(--color-${color}-dark)`
      );
      root.style.setProperty(
        '--color-primary-darker',
        `var(--color-${color}-darker)`
      );
    },
    setBrowserColors(color) {
      window.localStorage.setItem('color', color);
    },
    setBrowserTheme(value) {
      window.localStorage.setItem('dark', value);
    },
    setColors(color) {
      this.setAppColors(color);
      this.setBrowserColors(color);
    },
    setLightTheme() {
      this.setAppTheme(false);
      this.setBrowserTheme(false);
    },
    setDarkTheme() {
      this.setAppTheme(true);
      this.setBrowserTheme(true);
    },
    setDecentralized() {
      this.$i18n.locale = 'de';
    },
    setFederated() {
      this.$i18n.locale = 'fe';
    },
  },
};
</script>

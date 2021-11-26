<template>
  <tippy-container title="Settings">
    <template v-slot:icon> <settings-icon /></template>
    <template v-slot:content>
      <!-- Platform -->
      <tippy-card title="Platform">
        <div class="flex items-center space-x-8">
          <!-- Decentralized button -->
          <button
            v-on:click="setDecentralized"
            :class="buttonClass(this.$store.state.isDecentralized)"
          >
            <span><decentralised-icon /></span>
            <span>Decentralized</span>
          </button>

          <!-- Federated button -->
          <button
            v-on:click="setFederated"
            :class="buttonClass(!this.$store.state.isDecentralized)"
          >
            <span><federated-icon /></span>
            <span>Federated</span>
          </button>
        </div>
      </tippy-card>
      <div class="overflow-hidden hover:overflow-y-auto">
        <!-- IndexedDB -->
        <tippy-card title="Model library">
          <span class="text-s">
            Turn on to get storage options for your trained models. This uses
            your browser's own database, namely
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
            <button :class="buttonClass()" v-on:click="toggleIndexedDB()">
              <span class="text-s"> Use model library </span>
              <div class="relative focus:outline-none">
                <div
                  class="w-12 h-6 transition rounded-full outline-none bg-primary-100 dark:bg-primary-darker"
                ></div>
                <div
                  class="absolute top-0 left-0 inline-flex w-6 h-6 transition-all duration-200 ease-in-out transform scale-110 rounded-full shadow-sm"
                  :class="{
                    'translate-x-0 bg-white dark:bg-primary-100': !this.$store
                      .state.useIndexedDB,
                    'translate-x-6 bg-primary-light dark:bg-primary': this
                      .$store.state.useIndexedDB,
                  }"
                ></div>
              </div>
            </button>
          </div>
        </tippy-card>
        <!-- Theme -->
        <tippy-card title="Theme mode">
          <div class="flex items-center justify-center space-x-8">
            <!-- Light button -->
            <button
              v-on:click="setLightTheme"
              :class="buttonClass(!this.$store.state.isDark)"
            >
              <span><star-icon /></span>
              <span>Light</span>
            </button>

            <!-- Dark button -->
            <button
              v-on:click="setDarkTheme"
              :class="buttonClass(this.$store.state.isDark)"
            >
              <span><moon-icon /></span>
              <span>Dark</span>
            </button>
          </div>
        </tippy-card>

        <!-- Colors -->
        <tippy-card title="Secondary colors">
          <div class="flex justify-center">
            <div v-for="color in colors" :key="color">
              <button
                v-on:click="setColors(color)"
                class="w-10 h-10 rounded-full"
                :style="`background-color: var(--color-${color})`"
              />
            </div>
          </div>
        </tippy-card>
      </div>
    </template>
  </tippy-container>
</template>
<script>
import { mapMutations } from "vuex";
import TippyCard from "./containers/TippyCard.vue";
import TippyContainer from "./containers/TippyContainer.vue";
import MoonIcon from "../../assets/svg/MoonIcon.vue";
import StarIcon from "../../assets/svg/StarIcon.vue";
import DecentralisedIcon from "../../assets/svg/DecentralisedIcon.vue";
import FederatedIcon from "../../assets/svg/FederatedIcon.vue";
import SettingsIcon from "../../assets/svg/SettingsIcon.vue";

export default {
  name: "settings",
  components: {
    TippyCard,
    TippyContainer,
    MoonIcon,
    StarIcon,
    DecentralisedIcon,
    FederatedIcon,
    SettingsIcon,
  },
  data: function() {
    return {
      colors: ["cyan", "teal", "green", "fuchsia", "blue", "violet"],
    };
  },
  methods: {
    buttonClass: function(
      state,
      defaultClass = "flex items-center justify-center px-4 py-2 space-x-4 transition-colors border rounded-md hover:text-gray-900 hover:border-gray-900 dark:border-primary dark:hover:text-primary-100 dark:hover:border-primary-light focus:outline-none focus:ring focus:ring-primary-lighter focus:ring-offset-2 dark:focus:ring-offset-dark dark:focus:ring-primary-dark"
    ) {
      return (
        defaultClass +
        (state === undefined
          ? " "
          : state
          ? " border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100"
          : " text-gray-500 dark:text-primary-light")
      );
    },
    ...mapMutations(["setIndexedDB", "setAppTheme", "setPlatform"]),
    toggleIndexedDB() {
      this.setIndexedDB(!this.$store.state.useIndexedDB && window.indexedDB);
    },
    setAppColors(color) {
      const root = document.documentElement;
      root.style.setProperty("--color-primary", `var(--color-${color})`);
      root.style.setProperty("--color-primary-50", `var(--color-${color}-50)`);
      root.style.setProperty(
        "--color-primary-100",
        `var(--color-${color}-100)`
      );
      root.style.setProperty(
        "--color-primary-light",
        `var(--color-${color}-light)`
      );
      root.style.setProperty(
        "--color-primary-lighter",
        `var(--color-${color}-lighter)`
      );
      root.style.setProperty(
        "--color-primary-dark",
        `var(--color-${color}-dark)`
      );
      root.style.setProperty(
        "--color-primary-darker",
        `var(--color-${color}-darker)`
      );
    },
    setBrowserColors(color) {
      window.localStorage.setItem("color", color);
    },
    setBrowserTheme(value) {
      window.localStorage.setItem("dark", value);
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
      this.setPlatform(true);
      this.$i18n.locale = "deai";
    },
    setFederated() {
      this.setPlatform(false);
      this.$i18n.locale = "feai";
    },
  },
};
</script>

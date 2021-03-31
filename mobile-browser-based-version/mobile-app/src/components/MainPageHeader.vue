<template>
     <!-- Main Page Header-->
          <header
            class="flex items-center justify-between p-2 bg-white border-b dark:bg-darker dark:border-primary-darker">

            <div class="flex items-center space-x-4 md:space-x-0">
              <!-- Sidebar button (mobile version) -->
              <button v-on:click="StateStore.isSidebarOpen = true; $nextTick(() => { $refs.sidebar.focus() })"
                class="p-1 transition-colors duration-200 rounded-md text-primary-lighter bg-primary-50 md:hidden hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark focus:outline-none focus:ring">
                <span class="sr-only">Open main manu</span>
                <span aria-hidden="true">
                  <svg v-if="!StateStore.isSidebarOpen" class="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <svg v-if="StateStore.isSidebarOpen" class="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </button>
              <h1 class="text-2xl font-medium">MNIST Model (Note that for the moment we are using MobileNet)</h1>
            </div>

            <!-- Parameters buttons -->
            <div class="space-x-2">
              <!-- Toggle dark theme button -->
              <button aria-hidden="true" class="relative focus:outline-none" x-cloak v-on:click="toggleTheme">
                <div class="w-12 h-6 transition rounded-full outline-none bg-primary-100 dark:bg-primary-lighter"></div>
                <div
                  class="absolute top-0 left-0 inline-flex items-center justify-center w-6 h-6 transition-all duration-150 transform scale-110 rounded-full shadow-sm"
                  :class="{ 'translate-x-0 -translate-y-px  bg-white text-primary-dark': !StateStore.isDark, 'translate-x-6 text-primary-100 bg-primary-darker': StateStore.isDark }">
                  <svg v-if="!StateStore.isDark" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <svg v-if="StateStore.isDark" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </button>

              <!-- Search panel button -->
              <button v-on:click="openSearchPanel"
                class="p-1 transition-colors duration-200 rounded-md text-primary-lighter bg-primary-50 hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark focus:outline-none focus:ring">
                <span class="sr-only">Open search panel</span>
                <span aria-hidden="true">
                  <svg class="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </button>

              <!-- Setting button -->
              <button v-on:click="openSettingsPanel"
                class="p-2 transition-colors duration-200 rounded-full text-primary-lighter bg-primary-50 hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark focus:outline-none focus:bg-primary-100 dark:focus:bg-primary-dark focus:ring-primary-darker">
                <span class="sr-only">Open settings panel</span>
                <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </header>
</template>


<script>
import StateStore from '../store/stateStore'
export default {
  name: 'MainPageHeader',
  props: {
  },
  methods: {
        toggleTheme() {
          this.StateStore.isDark = !this.StateStore.isDark
          this.setTheme(this.StateStore.isDark)
        },
        setLightTheme() {
          this.StateStore.isDark = false
          this.setTheme(this.StateStore.isDark)
        },
        setDarkTheme() {
          this.StateStore.isDark = true
          this.setTheme(this.StateStore.isDark)
        },
        setTheme(value){
          window.localStorage.setItem('dark', value)
        },
        openSettingsPanel() {
          this.StateStore.isSettingsPanelOpen = true
          /*this.$nextTick(() => {
            this.$refs.settingsPanel.focus()
          })*/ //TODO: what is this used for?
        },
        openSearchPanel() {
          this.StateStore.isSearchPanelOpen = true
          /*this.$nextTick(() => {
            this.$refs.searchInput.focus()
          })*/
        },
        getTheme() {
        if (window.localStorage.getItem('dark')) {
          return JSON.parse(window.localStorage.getItem('dark'))
        }
        return !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      },
  },
  data(){
      return{
          StateStore: StateStore.data
      }
  }
}
</script>
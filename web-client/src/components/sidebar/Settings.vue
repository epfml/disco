<template>
  <TippyContainer>
    <template #title>
      Settings
    </template>
    <template #icon>
      <SettingsIcon />
    </template>
    <template #content>
      <div
        class="overflow-hidden hover:overflow-y-auto"
      >
        <!-- IndexedDB -->
        <TippyCard>
          <template #title>
            Model Library
          </template>
          <template #content>
            <span class="text-s">
              Turn on to get storage options for your trained models. This uses
              your browser's own database, namely
              <button class="text-blue-600">
                <a
                  href="https://en.wikipedia.org/wiki/Indexed_Database_API"
                  target="_blank"
                >
                  IndexedDB</a></button>.<br>
            </span>

            <div class="flex items-center justify-center">
              <button
                :class="buttonClass()"
                @click="toggleIndexedDB()"
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
                    bg-slate-200
                  "
                  />
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
                      'translate-x-0 bg-slate-300':
                        !memoryStore.useIndexedDB,
                      'translate-x-6 bg-disco-blue':
                        memoryStore.useIndexedDB,
                    }"
                  />
                </div>
              </button>
            </div>
          </template>
        </TippyCard>
        <!-- Theme
        <TippyCard title="Theme mode">
          <div class="flex items-center justify-center space-x-8">
            Light button
            <button
              :class="buttonClass((!$store.state.isDark).toString())"
              @click="setLightTheme"
            >
              <span><StarIcon /></span>
              <span>Light</span>
            </button>

            Dark button
            <button
              :class="buttonClass(($store.state.isDark).toString())"
              @click="setDarkTheme"
            >
              <span><MoonIcon /></span>
              <span>Dark</span>
            </button>
          </div>
        </TippyCard>
      -->
      </div>
    </template>
  </TippyContainer>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useMemoryStore } from '@/store/memory'
import TippyCard from './containers/TippyCard.vue'
import TippyContainer from './containers/TippyContainer.vue'
// import MoonIcon from '../../assets/svg/MoonIcon.vue'
// import StarIcon from '../../assets/svg/StarIcon.vue'
import SettingsIcon from '../../assets/svg/SettingsIcon.vue'

export default defineComponent({
  name: 'Settings',
  components: {
    TippyCard,
    TippyContainer,
    // MoonIcon,
    // StarIcon,
    SettingsIcon
  },
  data: function () {
    return {
      colors: ['cyan', 'teal', 'green', 'fuchsia', 'blue', 'violet']
    }
  },
  computed: {
    ...mapStores(useMemoryStore)
  },
  methods: {
    buttonClass: function (
      state = ' ',
      defaultClass = 'flex items-center justify-center px-4 py-2 space-x-4 transition-colors border rounded-md hover:text-slate-900 hover:border-slate-900 focus:outline-none focus:ring focus:ring-slate-900 focus:ring-offset-2'
    ) {
      return (
        defaultClass +
        (state === undefined
          ? ' '
          : state
            ? ' border-slate-900 text-slate-900'
            : ' text-slate-500')
      )
    },
    toggleIndexedDB () {
      this.memoryStore.setIndexedDB(!this.memoryStore.useIndexedDB && Boolean(window.indexedDB))
    },
    setBrowserTheme (value: string) {
      window.localStorage.setItem('dark', value)
    },
    setLightTheme () {
      this.setBrowserTheme('false')
    },
    setDarkTheme () {
      this.setBrowserTheme('true')
    }
  }
})
</script>

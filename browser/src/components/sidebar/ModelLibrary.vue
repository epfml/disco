<template>
  <TippyContainer>
    <template #title>
      Model Library
    </template>
    <template #icon>
      <StackIcon />
    </template>
    <template #content>
      <!-- Model list -->
      <TippyCard>
        <template #title>
          My Model Library
        </template>
        <template #content>
          <span class="text-s">
            <p v-if="useIndexedDB">List of trained models that were saved.</p>
            <p v-else>
              The model library is currently unavailable. You can turn it on in
              the
              <button
                class="text-blue-600"
                @click="switchToSettings()"
              >
                settings menu</button>.
            </p>
          </span>
          <div
            v-if="useIndexedDB"
            class="space-y-4"
          >
            <div
              v-for="[path, metadata] in models"
              :key="path"
              class="
                flex
                items-center
                justify-between
                px-4
                py-2
                space-x-4
                transition-colors
                border
                rounded-md
                hover:text-slate-900 hover:border-slate-900
                focus:outline-none
                focus:ring
                focus:ring-slate-100
                focus:ring-offset-2
              "
            >
              <div
                class="cursor-pointer w-2/3"
                @click="openTesting(path)"
              >
                <span>
                  {{ metadata.name.substring(0, 16) }} <br>
                  <span class="text-xs">
                    {{ metadata.date }} at {{ metadata.hours }} <br>
                    {{ metadata.fileSize }} kB
                  </span>
                </span>
              </div>
              <div class="w-1/9">
                <button
                  :class="buttonClass(isDark)"
                  @click="deleteModel(path)"
                >
                  <span><Bin2Icon /></span>
                </button>
              </div>
              <div class="w-1/9">
                <button
                  :class="buttonClass(isDark)"
                  @click="downloadModel(path)"
                >
                  <span><Download2Icon /></span>
                </button>
              </div>
              <div class="w-1/9">
                <button
                  :class="buttonClass(isDark)"
                  @click="loadModel(path)"
                >
                  <span><LoadIcon /></span>
                </button>
              </div>
            </div>
          </div>
        </template>
      </TippyCard>
    </template>
  </TippyContainer>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { mapMutations, mapState } from 'vuex'

import { Memory, EmptyMemory, Path, ModelType } from 'discojs'

import { IndexedDB } from '@/memory'
import Bin2Icon from '@/assets/svg/Bin2Icon.vue'
import Download2Icon from '@/assets/svg/Download2Icon.vue'
import LoadIcon from '@/assets/svg/LoadIcon.vue'
import StackIcon from '@/assets/svg/StackIcon.vue'
import TippyCard from '@/components/sidebar/containers/TippyCard.vue'
import TippyContainer from '@/components/sidebar/containers/TippyContainer.vue'
import { toaster } from '@/toast'

export default defineComponent({
  name: 'ModelLibrary',
  components: {
    Bin2Icon,
    Download2Icon,
    LoadIcon,
    StackIcon,
    TippyCard,
    TippyContainer
  },
  emits: ['switch-panel'],
  computed: {
    ...mapState(['useIndexedDB', 'isDark', 'models']),

    memory (): Memory {
      return this.useIndexedDB ? new IndexedDB() : new EmptyMemory()
    }
  },
  async mounted (): Promise<void> {
    await this.$store.dispatch('initModels')
  },
  methods: {
    ...mapMutations(['setTestingModel']),

    buttonClass: function (state: boolean) {
      return `flex items-center grid-cols-3 justify-between px-4 py-2 space-x-4 transition-colors border rounded-md hover:text-gray-900 hover:border-gray-900 dark:border-primary dark:hover:text-primary-100 dark:hover:border-primary-light focus:outline-none focus:ring focus:ring-primary-lighter focus:ring-offset-2 dark:focus:ring-offset-dark dark:focus:ring-primary-dark ${
        state
          ? 'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100'
          : 'text-gray-500 dark:text-primary-light'
      }`
    },

    switchToSettings (): void {
      this.$emit('switch-panel')
    },

    async deleteModel (path: Path): Promise<void> {
      try {
        await this.$store.commit('deleteModel', path)
        await this.memory.deleteModel(path)
        toaster.success('Successfully deleted the model')
      } catch (e) {
        toaster.error(e.message)
      }
    },

    openTesting (path: Path) {
      this.setTestingModel(path)
      this.$router.push({ path: '/testing' })
    },

    async downloadModel (path: Path) {
      await this.memory.downloadModel(path)
    },

    async loadModel (path: Path) {
      console.log(path)
      const modelInfo = this.memory.infoFor(path)
      if (modelInfo.type !== ModelType.WORKING) {
        try {
          await this.memory.loadModel(path)
        } catch (e) {
          console.log(e.message)
          toaster.error('Error')
        }
        toaster.success(`Loaded ${modelInfo.name}, ready for next training session.`)
      } else {
        toaster.error('Model is already loaded')
      }
    }
  }
})
</script>

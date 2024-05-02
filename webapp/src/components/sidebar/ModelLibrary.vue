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
            <p v-if="memoryStore.useIndexedDB">
              List of trained models that were saved. 
              You can download pre-trained models in the <button
                class="text-blue-600"
                @click="switchToEvaluate()"
              >Evaluation page</button>.</p>
            <p v-else>
              The model library is currently unavailable. You can turn it on in
              the settings below.
            </p>
          </span>
          <div
            v-if="memoryStore.useIndexedDB"
            class="space-y-4"
          >
            <button
              v-for="[path, metadata] in memoryStore.models"
              :key="path"
              class="
                flex items-center justify-between
                px-4 py-2 space-x-4
                outline outline-1 outline-slate-300 rounded-md
                transition-colors duration-200
                text-slate-600
                hover:text-slate-800 hover:outline-slate-800
                focus:outline-none
                focus:ring-1 focus:ring-slate-800
              "
            >
              <div
                class="cursor-pointer w-2/3"
                @click="openTesting(path)"
              >
                <span>
                  {{ metadata.name.slice(0, 16) }}
                  <span v-if="metadata.version !== undefined && metadata.version !== 0">
                    ({{ metadata.version }})
                  </span><br>
                  <span class="text-xs">
                    {{ metadata.date }} at {{ metadata.hours }} <br>
                    {{ metadata.fileSize }} kB
                  </span>
                </span>
              </div>
              <div class="w-1/9">
                <ModelButton
                  event="delete-model"
                  hover="Delete"
                  @delete-model="deleteModel(path)"
                >
                  <Bin2Icon />
                </ModelButton>
              </div>
              <div class="w-1/9">
                <ModelButton
                  event="download-model"
                  hover="Download"
                  @download-model="downloadModel(path)"
                >
                  <Download2Icon />
                </ModelButton>
              </div>
              <div class="w-1/9">
                <ModelButton
                  event="load-model"
                  hover="Load for next training"
                  @load-model="loadModel(path)"
                >
                  <LoadIcon />
                </ModelButton>
              </div>
            </button>
          </div>
        </template>
      </TippyCard>
      <div
        class="overflow-hidden hover:overflow-y-auto"
      >
        <!-- IndexedDB -->
        <TippyCard>
          <template #title>
            Settings
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
      </div>
    </template>
  </TippyContainer>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import type { Path } from '@epfml/discojs'
import { Memory, EmptyMemory, ModelType } from '@epfml/discojs'
import { IndexedDB } from '@epfml/discojs-web'

import { useToaster } from '@/composables/toaster'
import { useMemoryStore } from '@/store/memory'
import { useValidationStore } from '@/store/validation'
import ModelButton from './simple/ModelButton.vue'
import Bin2Icon from '@/assets/svg/Bin2Icon.vue'
import Download2Icon from '@/assets/svg/Download2Icon.vue'
import LoadIcon from '@/assets/svg/LoadIcon.vue'
import StackIcon from '@/assets/svg/StackIcon.vue'
import TippyCard from '@/components/sidebar/containers/TippyCard.vue'
import TippyContainer from '@/components/sidebar/containers/TippyContainer.vue'

const toaster = useToaster()

export default defineComponent({
  name: 'ModelLibrary',
  components: {
    Bin2Icon,
    Download2Icon,
    LoadIcon,
    StackIcon,
    TippyCard,
    TippyContainer,
    ModelButton
  },
  emits: ['close-panel'],
  computed: {
    ...mapStores(useMemoryStore, useValidationStore),

    memory (): Memory {
      return this.memoryStore.useIndexedDB ? new IndexedDB() : new EmptyMemory()
    }
  },
  async mounted (): Promise<void> {
    await this.memoryStore.initModels()
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
    toggleIndexedDB() {
      this.memoryStore.setIndexedDB(!this.memoryStore.useIndexedDB && Boolean(window.indexedDB))
    },
    switchToEvaluate (): void {
      this.$router.push({ path: '/evaluate' })
      this.$emit('close-panel')
    },

    async deleteModel (path: Path): Promise<void> {
      try {
        await this.memoryStore.deleteModel(path)
        await this.memory.deleteModel(path)
        toaster.success('Successfully deleted the model')
      } catch (e) {
        let msg = 'unable to delete model'
        if (e instanceof Error) {
          msg += `: ${e.message}`
        }
        toaster.error(msg)
      }
    },

    openTesting (path: Path) {
      this.validationStore.setModel(path)
      this.$router.push({ path: '/evaluate' })
    },

    async downloadModel (path: Path) {
      await this.memory.downloadModel(path)
    },

    async loadModel (path: Path) {
      const modelInfo = this.memory.infoFor(path)
      if (modelInfo === undefined) {
        throw new Error('not such model')
      }
      if (modelInfo.type !== ModelType.WORKING) {
        try {
          await this.memory.loadModel(path)
          await this.memoryStore.initModels()
        } catch (e) {
          let msg = 'unable to load model'
          if (e instanceof Error) {
            msg += `: ${e.message}`
          }
          toaster.error(msg)
        }
        toaster.success(`Loaded ${modelInfo.name}, ready for next training session.`)
      } else {
        toaster.error('Model is already loaded')
      }
    }
  }
})
</script>

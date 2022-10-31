/* eslint-disable no-unused-expressions */
<template>
  <!-- Upload File Card-->
  <div>
    <article
      aria-label="File Upload Model"
      class="
        h-full
        flex flex-col
        md:p-8
        bg-white
        rounded-lg
      "
      @drop.prevent
      @dragover.prevent
      @dragenter.prevent
    >
      <!-- scroll area -->
      <section class="overflow-auto">
        <header
          class="
            border-dashed rounded-xl border-2 border-disco-cyan
            flex flex-col
            justify-center
            items-center
          "
          @drop="dragFiles"
        >
          <p
            class="
              p-4
              text-lg
              text-disco-blue
              font-semibold
              flex-wrap
              justify-center
            "
          >
            <span>Drag and drop your</span>&nbsp;<span>file{{ isMultiple ? 's' : '' }} or</span>
          </p>
          <label class="pb-4">
            <div
              class="
              justify-self-center
              p-2
              rounded-sm
              text-white
              transition
              duration-200
              bg-disco-cyan
              hover:text-disco-cyan hover:bg-white
              hover:outline hover:outline-2 hover:outline-disco-cyan
              hover:cursor-pointer"
            >
              Select file{{ isMultiple ? 's' : '' }}
            </div>
            <input
              v-if="isDirectory"
              type="file"
              multiple
              webkitdirectory
              directory
              class="hidden"
              @change="submitFiles"
            >
            <input
              v-else
              type="file"
              :multiple="isMultiple"
              :accept="acceptFiles.join(',')"
              class="hidden"
              @change="submitFiles"
            >
          </label>
        </header>

        <div
          v-if="infoText"
          class="pt-2 flex justify-center"
        >
          <p class="text-disco-cyan text-sm">
            Note: {{ infoText }}
          </p>
        </div>

        <!-- If preview of the selected file, display of small preview of selected files -->

        <!-- TODO: There is a recursion issue with preview-gallery -->
        <!-- <div v-if="preview">
          <preview-gallery :fileUploadManager="fileUploadManager" />
          <div v-else>
            ...
        </div> -->

        <!-- If no preview of the selected file, display the nbr. of uploaded files -->
        <div class="pt-8 flex flex-col md:grid md:grid-cols-3 items-center">
          <div class="flex justify-center items-center text-center md:text-left font-semibold sm:text-lg text-disco-blue">
            <span v-if="isMultiple">Number of selected files: <span class="pl-1 text-xl">{{ selectedFiles?.length ?? 0 }}</span></span>
            <span v-else>Selected file: <span class="pl-1">{{ selectedFiles?.item(0).name ?? 'None' }}</span></span>
          </div>
          <button
            class="
                justify-self-center
                p-2
                m-2
                rounded-sm
                text-white
                transition
                duration-200
                bg-disco-cyan
                hover:text-disco-cyan hover:bg-white
                hover:outline hover:outline-2 hover:outline-disco-cyan
              "
            @click="clearFiles"
          >
            Clear file{{ isMultiple ? 's' : '' }}
          </button>
        </div>
      </section>
    </article>
  </div>
</template>

<script lang="ts" setup>
import { defineEmits, ref, defineProps, withDefaults } from 'vue'

import { HTMLDragEvent, HTMLInputEvent } from '@/types'

interface Emits {
  (e: 'input', files: FileList): void
  (e: 'clear'): void
}

interface Props {
  isDirectory?: boolean,
  acceptFiles?: string[],
  isMultiple?: boolean,
  infoText?: string
}
const emit = defineEmits<Emits>()
const selectedFiles = ref<FileList>()

withDefaults(defineProps<Props>(), {
  isDirectory: false,
  isMultiple: true,
  acceptFiles: () => ['*'],
  infoText: ''
})

const clearFiles = () => {
  emit('clear')
  selectedFiles.value = null
}
const submitFiles = (e: HTMLInputEvent) => {
  emit('input', e.target.files)
  selectedFiles.value = e.target.files
}
const dragFiles = (e: HTMLDragEvent) => {
  e.dataTransfer.dropEffect = 'copy'
  emit('input', e.dataTransfer.files)
  selectedFiles.value = e.dataTransfer.files
}
</script>

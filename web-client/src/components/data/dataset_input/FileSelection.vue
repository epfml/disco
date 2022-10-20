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
              text-slate-700
              font-semibold
              flex-wrap
              justify-center
            "
          >
            <span>Drag and drop your</span>&nbsp;<span>files or</span>
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
              Select files
            </div>
            <input
              type="file"
              multiple
              class="hidden"
              @change="submitFiles"
            >
          </label>
        </header>

        <!-- If preview of the selected file, display of small preview of selected files -->

        <!-- TODO: There is a recursion issue with preview-gallery -->
        <!-- <div v-if="preview">
          <preview-gallery :fileUploadManager="fileUploadManager" />
          <div v-else>
            ...
        </div> -->

        <!-- If no preview of the selected file, display the nbr. of uploaded files -->
        <div class="pt-8 flex flex-col md:grid md:grid-cols-3 items-center">
          <div class="flex justify-center items-center text-center md:text-left font-semibold text-slate-700 sm:text-lg">
            <span>Number of selected files: <span class="pl-1 text-xl">{{ nbrSelectedFiles }}</span></span>
          </div>
          <button
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
              "
            @click="clearFiles"
          >
            Clear files
          </button>
        </div>
      </section>
    </article>
  </div>
</template>

<script lang="ts" setup>
import { defineEmits, ref } from 'vue'

import { HTMLDragEvent, HTMLInputEvent } from '@/types'

interface Emits {
  (e: 'input', files: FileList): void
  (e: 'clear'): void
}
const emit = defineEmits<Emits>()

const nbrSelectedFiles = ref(0)

const clearFiles = () => {
  emit('clear')
  nbrSelectedFiles.value = 0
}
const submitFiles = (e: HTMLInputEvent) => {
  emit('input', e.target.files)
  nbrSelectedFiles.value += e.target.files.length
}
const dragFiles = (e: HTMLDragEvent) => {
  e.dataTransfer.dropEffect = 'copy'
  emit('input', e.dataTransfer.files)
  nbrSelectedFiles.value += e.dataTransfer.files.length
}
</script>

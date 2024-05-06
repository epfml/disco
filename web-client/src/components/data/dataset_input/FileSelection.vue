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
              flex-wrap
              justify-center
            "
          >
            <span>Drag and drop your</span>&nbsp;<span>file{{ isMultiple ? 's' : '' }} or</span>
          </p>
          <label class="mb-6">
            <span
              class="
                  px-4 py-2 min-w-[8rem]
                  text-lg uppercase text-white
                  bg-disco-cyan
                  rounded duration-200
                  hover:bg-white hover:outline hover:outline-disco-cyan hover:outline-2 hover:text-disco-cyan
                  hover:cursor-pointer
                "
            >
              select file{{ isMultiple ? 's' : '' }}
            </span>
            <input
              v-if="isDirectory"
              ref="uploadDirectory"
              type="file"
              multiple
              webkitdirectory
              directory
              class="hidden"
              @change="submitDirectory"
            >
            <input
              v-else
              ref="uploadFile"
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
          class="mt-4 md:mt-8 flex justify-centerz"
        >
          <p class="text-slate-500 text-sm">
            Note: <span><slot name="text" /></span>
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
        <div class="pt-8 flex flex-col items-center pb-2">
          <div 
            v-if="selectedFiles?.length"
            class="mb-4 flex justify-center items-center text-center md:text-left sm:text-lg text-disco-blue">
            <span v-if="isMultiple">Number of selected files: <span class="pl-1 text-xl">{{ selectedFiles?.length ?? 0 }}</span></span>
            <span v-else>Selected file: <span class="pl-1">{{ selectedFiles?.item(0)?.name ?? 'none' }}</span></span>
          </div>
          <CustomButton @click="clearFiles">
            clear file{{ isMultiple ? 's' : '' }}
          </CustomButton>
        </div>
      </section>
    </article>
  </div>
</template>

<script lang="ts" setup>
import { ref, withDefaults } from 'vue'

import CustomButton from '@/components/simple/CustomButton.vue'

interface Emits {
  (e: 'input', files: FileList): void
  (e: 'clear'): void
}

interface Props {
  isDirectory?: boolean,
  acceptFiles?: string[],
  isMultiple?: boolean,
  infoText?: boolean
}
const emit = defineEmits<Emits>()
const selectedFiles = ref<FileList>()

const uploadFile = ref<HTMLInputElement>()
const uploadDirectory = ref<HTMLInputElement>()

withDefaults(defineProps<Props>(), {
  isDirectory: false,
  isMultiple: true,
  acceptFiles: () => ['*'],
  infoText: false
})

const clearFiles = () => {
  emit('clear')
  selectedFiles.value = undefined
}
const submitFiles = () => {
  if (uploadFile.value === undefined) return
  const files = uploadFile.value.files
  if (files === null) return

  emit('input', files)
  selectedFiles.value = files
}
const submitDirectory = () => {
  if (uploadDirectory.value === undefined) return
  const files = uploadDirectory.value.files
  if (files === null) return

  emit('input', files)
  selectedFiles.value = files
}
const dragFiles = (e: DragEvent) => {
  if (e.dataTransfer === null) return

  e.dataTransfer.dropEffect = 'copy'
  emit('input', e.dataTransfer.files)
  selectedFiles.value = e.dataTransfer.files
}
</script>

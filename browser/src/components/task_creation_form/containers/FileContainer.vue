<template>
  <div>
    <div class="h-72">
      <div
        class="
          relative
          h-full
          hover:cursor-pointer
          border-dashed border-2 border-gray-500
          dark:border-primary
          flex flex-col
          justify-center
          items-center
        "
      >
        <div class="absolute">
          <div class="flex flex-col items-center">
            <svg
              class="w-8 h-8"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path
                d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z"
              /></svg><span class="block text-gray-400 font-normal">Drag and drop your file anywhere or</span>
            <span class="block text-gray-400 font-normal">or</span>
            <span
              class="
                block
                font-normal
                mt-2
                p-2
                rounded-sm
                text-slate-700
                transition-colors
                duration-200
                bg-white
                hover:text-disco-cyan hover:bg-slate-100
                focus:outline-none
              "
            >select file</span>
          </div>
        </div>

        <VeeField
          :id="props.field.id"
          :type="props.field.type"
          :name="props.field.id"
          class="h-full w-full opacity-0"
          :accept="props.field.extension"
        />
      </div>
    </div>
    <div
      class="flex justify-between items-center text-gray-400"
    >
      <span>Accepted file type: {{ props.field.extension }} only</span>
      <span class="flex items-center"><i class="fa fa-lock mr-1" /> secure</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineProps } from 'vue'
import { Field as VeeField } from 'vee-validate'

import { FormField } from '@/task_creation_form'

interface Props {
  field: FormField
}
const props = defineProps<Props>()
</script>

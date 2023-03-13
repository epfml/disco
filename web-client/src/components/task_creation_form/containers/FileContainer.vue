<template>
  <div>
    <div
      class="h-72 my-3"
    >
      <div
        class="
          relative h-full
          border-dashed border-2 border-disco-cyan
          flex flex-col justify-center items-center
        "
        :class="available ? 'hover:cursor-pointer' : 'hover:cursor-not-allowed'"
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
            <label
              :for="`hidden_${field.id}`"
              class="
                block
                font-normal
                mt-2 p-2
                rounded-sm
                text-slate-700
                transition-colors
                duration-200
                bg-slate-100
                focus:outline-none
              "
              :class="available ? 'hover:cursor-pointer hover:text-disco-cyan' : 'hover:cursor-not-allowed'"
            >select file</label>
            <VeeField
              :id="field.id"
              v-model="fileName"
              :name="field.id"
              hidden
            />
            <input
              :id="`hidden_${field.id}`"
              :accept="field.extension"
              :disable="!available"
              type="file"
              class="h-full w-full"
              multiple
              :disabled="!available"
              hidden
              @change="onChange"
            >
          </div>
        </div>
      </div>
    </div>
    <div
      class="flex justify-between items-center text-gray-400"
    >
      <span>Accepted file type: {{ field.extension }} only</span>
      <span class="flex items-center"><i class="fa fa-lock mr-1" /> secure</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits, ref } from 'vue'
import { Field as VeeField } from 'vee-validate'

import { HTMLInputEvent } from '@/types'
import { FormField } from '@/creation_form'

const { field, available = true } = defineProps({
  field: {
    type: Object as () => FormField,
    required: true
  },
  available: {
    type: Boolean,
    default: true
  }
})

interface Emits {
  (e: 'input', files: FileList): void
}
const emit = defineEmits<Emits>()

const fileName = ref('')

const onChange = (e: HTMLInputEvent): void => {
  const files = e.target.files
  // fill in the vee-field to trigger yup validation
  fileName.value = (files.length > 0) ? files[0].name : ''
  emit('input', files)
}
</script>

<template>
  <VeeField
    :id="props.field.id"
    :name="props.field.id"
    class="
    bg-gray-100 rounded-md border px-3 py-2 mt-1
    dark:bg-slate-700 dark:border-slate-400
      block w-full
    text-gray-700
    dark:text-gray-200
      focus:outline-none focus:border-disco-cyan
    "
    :class="{ 'hover:cursor-not-allowed': !available }"
    :as="props.field.as"
    :type="props.field.type"
    :placeholder="props.field.default"
    v-bind="{ ...props, field: undefined }"
  />
</template>

<script lang="ts" setup>
import { Field as VeeField } from 'vee-validate'

import type { FormField } from '@/task_creation_form'

const props = defineProps({
  field: {
    type: Object as () => FormField,
    required: true
  },
  rows: {
    type: Number,
    default: undefined
  },
  step: {
    type: String,
    default: undefined
  },
  available: {
    type: Boolean,
    default: true
  }
})
</script>

<template>
  <VeeField
    :id="props.field.id"
    :name="props.field.id"
    class="
      bg-transparent
      border-b
      block
      focus:outline-none focus:border-green-500
      w-full
      mb-6
      text-gray-700
      pb-1
    "
    :as="props.field.as"
    :type="props.field.type"
    :placeholder="props.field.default"
    v-bind="{ ...props, field: undefined }"
  />
</template>

<script lang="ts" setup>
import { defineProps } from 'vue'
import { Field as VeeField } from 'vee-validate'

import { FormField } from '@/task_creation_form'

const props = defineProps({
  field: {
    type: Object as () => FormField,
    required: true
  },
  value: {
    type: Boolean,
    default: undefined
  },
  rows: {
    type: Number,
    default: undefined
  },
  step: {
    type: String,
    default: undefined
  }
})
</script>

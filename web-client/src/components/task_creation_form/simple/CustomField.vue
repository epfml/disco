<template>
  <VeeField
    :id="props.field.id"
    :name="props.field.id"
    class="
    bg-gray-100 rounded-md border px-3 py-2 mt-1
      block w-full
    text-gray-700
      focus:outline-none focus:border-disco-cyan
    "
    :class="{ 'hover:cursor-not-allowed': !available }"
    :as="props.field.as"
    :type="props.field.type"
    :placeholder="props.field.default"
    :value="props.field.value"
    v-bind="{ ...props, field: undefined }"
  />
</template>

<script lang="ts" setup>
import { defineProps } from 'vue'
import { Field as VeeField } from 'vee-validate'

import { FormField } from '@/creation_form'

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

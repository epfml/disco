<template>
  <VeeField
    :id="props.field.id"
    v-slot="{ value }"
    as="select"
    :name="props.field.id"
    :select="props.field.type === 'select-multiple'"
    :multiple="props.field.type === 'select-multiple'"
    class="
      bg-transparent
      border-b
      m-auto
      block
      focus:outline-none focus:border-green-500
      w-full
      mb-6
      text-gray-700
      pb-1
    "
  >
    <option
      v-for="option in props.field.options"
      :key="option"
      :value="option"
      :selected="value !== undefined && (value as string[]).includes(option)"
    >
      {{ option }}
    </option>
  </VeeField>
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

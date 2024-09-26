<template>
  <VeeField
    :id="props.field.id"
    v-slot="{ value }"
    as="select"
    :name="props.field.id"
    :select="props.field.type === 'select-multiple'"
    :multiple="props.field.type === 'select-multiple'"
    class="
      bg-gray-100 rounded-md border p-2 mt-1
      dark:bg-slate-700 dark:border-slate-400
      block w-full
      text-gray-700
      dark:text-gray-200
      focus:outline-none focus:border-disco-cyan
    "
  >
    <option
      v-for="option in props.field.options"
      :key="option"
      :value="option.split(' ')[0].toLowerCase()"
      :selected="value !== undefined && (value as unknown[]).includes(option)"
    >
      {{ option }}
    </option>
  </VeeField>
</template>

<script lang="ts" setup>
import { Field as VeeField } from 'vee-validate'

import type { FormField } from '@/task_creation_form'

interface Props {
  field: FormField
}
const props = defineProps<Props>()
</script>

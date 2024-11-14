<template>
  <Field
    :name
    class="p-2 bg-gray-100 dark:bg-slate-700 border rounded-md dark:border-slate-400 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-disco-cyan"
    v-model="model"
    v-bind="$attrs"
  >
    <!-- forward slots, https://stackoverflow.com/questions/50891858 -->
    <template v-for="(_, slot) in $slots" v-slot:[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </Field>

  <ErrorMessage class="text-red-600" :name />
</template>

<script lang="ts" setup>
import { ErrorMessage, Field } from "vee-validate";

defineProps<{ name: string }>();

const model = defineModel<string>();

// https://vuejs-language-tools.vercel.app/features/slots#how-to-handle-indeterminate-slot-types
defineSlots();
</script>

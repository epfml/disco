<template>
  <Field
    v-model="model"
    v-bind="$attrs"
    :name
    class="p-2 bg-gray-100 dark:bg-slate-700 border rounded-md border-gray-200 dark:border-slate-400 text-gray-700 dark:text-gray-200 focus:outline-hidden focus:border-disco-cyan"
  >
    <!-- forward slots, https://stackoverflow.com/questions/50891858 -->
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </Field>

  <ErrorMessage v-if="!supressError" class="text-red-600" :name />
</template>

<script lang="ts" setup>
import { ErrorMessage, Field } from "vee-validate";

withDefaults(defineProps<{ name: string; supressError?: boolean }>(), {
  supressError: false,
});
const model = defineModel<string>();

// https://vuejs-language-tools.vercel.app/features/slots#how-to-handle-indeterminate-slot-types
defineSlots();
</script>

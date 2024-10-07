<template>
  <FieldArray
    :id="props.field.id"
    v-slot="{ fields, push, remove }"
    :name="props.field.id"
  >
    <br>
    <fieldset
      v-for="(entry, idx) in fields"
      :key="(entry as any).key"
    >
      <div
        class="
          grid grid-flow-col
          auto-cols-max
          md:auto-cols-min
          space-x-2
        "
      >
        <div class="w-4/5 md:w-full">
          <VeeField
            :id="`${props.field.id}_${idx as any}`"
            :name="`${props.field.id}[${idx as any}]`"
            :placeholder="props.field.default"
            class="
              inline
              bg-gray-100
              dark:bg-slate-700
              appearance-none
              border-0 border-gray-200
              rounded
              py-2
              px-4
              text-gray-700
              dark:text-gray-200
              leading-tight
              focus:outline-none
              focus:bg-white
              dark:focus:bg-slate-900
            "
          />
          <ErrorMessage
            class="text-red-600"
            :name="`${props.field.id}[${idx as any}]`"
          />
        </div>
        <div class="w-1/5 md:w-full">
          <button
            type="button"
            class="
              h-7
              w-7
              flex
              justify-center
              items-center
              mt-1
              transition-colors
              duration-150
              bg-transparent
              rounded
              focus:shadow-outline
              hover:bg-red-100
              dark:hover:bg-red-900
            "
            @click="remove(idx as unknown as number)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              x="0px"
              y="0px"
              width="40"
              height="40"
              viewBox="0 0 48 48"
              style="fill: #000000"
            >
              <path
                fill="#F44336"
                d="M21.5 4.5H26.501V43.5H21.5z"
                transform="rotate(45.001 24 24)"
              />
              <path
                fill="#F44336"
                d="M21.5 4.5H26.5V43.501H21.5z"
                transform="rotate(135.008 24 24)"
              />
            </svg>
          </button>
        </div>
      </div>
    </fieldset>

    <button
      type="button"
      class="
        inline-flex
        items-center
        h-10
        px-5
        transition-colors
        duration-150
        bg-transparent
        border-0
        rounded
        focus:shadow-outline
        hover:bg-gray-100
        dark:hover:bg-gray-800
      "
      @click="push('')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        x="0px"
        y="0px"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        style="fill: #6b7280"
        class="w-4 h-4 mr-3 fill-current"
      >
        <path
          fill-rule="evenodd"
          d="M 11 2 L 11 11 L 2 11 L 2 13 L 11 13 L 11 22 L 13 22 L 13 13 L 22 13 L 22 11 L 13 11 L 13 2 Z"
        />
      </svg>
      <span class="md:text-right mb-1 md:mb-0 pr-4">
        Add Element
      </span>
    </button>
  </FieldArray>
</template>

<script lang="ts" setup>
import {
  Field as VeeField,
  FieldArray,
  ErrorMessage
} from 'vee-validate'

import type { FormField } from '@/task_creation_form'

interface Props {
  field: FormField
}
const props = defineProps<Props>()
</script>

<template>
  <table class="text-left w-full">
    <thead class="border-b-4 flex px-2">
      <tr class="flex w-full py-2">
        <th
          v-for="(column, index) in columns"
          :key="index"
          class="text-left font-bold min-w-[200px]"
        >
          {{ column }}
        </th>
      </tr>
    </thead>

    <tbody
      class="flex flex-col overflow-y-scroll w-full h-128 px-2"
    >
      <tr
        v-for="(row, i) in rows"
        :key="i"
      >
        <td
          v-for="(value, j) in row"
          :key="j"
          class="min-w-[200px]"
        >
          {{ value }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'TableLayout',
  props: {
    columns: { default: () => {}, type: Array },
    rows: { default: () => {}, type: Array }
  }
})
</script>

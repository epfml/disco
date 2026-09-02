<template>
  <div class="mx-auto w-full max-w-card space-y-4 md:space-y-8">
    <DropdownCard>
      <template #title> Expected Data Format </template>

      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <!-- Sample dataset link and instructions -->
          <div
            v-if="task.displayInformation.sampleDataset !== undefined"
            class="mb-5 tuto-example-data"
          >
            <b>Don't have any data?</b> You can download an example dataset
            <a
              target="_blank"
              class="underline text-blue-400"
              :href="task.displayInformation.sampleDataset.link"
              >here</a
            >. <br />
            <span>
              {{ task.displayInformation.sampleDataset.instructions }}
            </span>
          </div>
          <!-- Sample dataset link and instructions -->
          <div>
            {{ task.displayInformation.dataFormatInformation }}
          </div>
        </div>

        <!-- data example -->
        <template v-if="task.displayInformation.dataExample !== undefined">
          <figure v-if="task.dataType === 'image'">
            <figcaption>Example of an image</figcaption>
            <img class="m-auto" :src="task.displayInformation.dataExample" />
          </figure>

          <table v-if="task.dataType === 'tabular'">
            <caption>
              Example of a tabular row
            </caption>
            <tbody>
              <tr
                v-for="column in task.displayInformation.dataExample"
                :key="column.name"
              >
                <th>{{ column.name }}</th>
                <td>{{ column.data }}</td>
              </tr>
            </tbody>
          </table>

          <figure v-if="task.dataType === 'text'">
            <figcaption>Example of a text</figcaption>
            <p class="italic text-justify">
              {{ task.displayInformation.dataExample }}
            </p>
          </figure>
        </template>
      </div>
    </DropdownCard>
  </div>
</template>

<script setup lang="ts">
import type { DataType, Network, Task } from "@epfml/discojs";

import DropdownCard from "@/components/containers/DropdownCard.vue";

defineProps<{ task: Task<DataType, Network> }>();
</script>

<style lang="css" scoped>
table {
  table-layout: fixed;
  width: 100%;
}

caption,
figcaption {
  margin: 0.5em;
  text-align: center;
}
</style>

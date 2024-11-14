<template>
  <div class="space-y-4 md:space-y-8 mx-auto w-full max-w-[700px]">
    <IconCard>
      <template #title>
        {{ props.task.displayInformation.title }}
      </template>

      <div v-html="props.task.displayInformation.summary.preview" />
      <div v-html="props.task.displayInformation.summary.overview" />
    </IconCard>

    <IconCard v-if="task.displayInformation.model !== undefined">
      <template #title> The Model </template>
      <template #icon> <ModelIcon /> </template>

      <div v-html="task.displayInformation.model" />
    </IconCard>

    <DropdownCard>
      <template #title> Parameters </template>

      <table>
        <tbody>
          <tr>
            <th colspan="2" class="text-slate-600 dark:text-slate-200">
              Training
            </th>
          </tr>
          <tr>
            <th>Epochs</th>
            <td>{{ task.trainingInformation.epochs }}</td>
          </tr>
          <tr>
            <th>Validation split</th>
            <td>{{ task.trainingInformation.validationSplit }}</td>
          </tr>
          <tr>
            <th>Batch size</th>
            <td>{{ task.trainingInformation.batchSize }}</td>
          </tr>
          <tr>
            <th>Minimum # of ready peers before aggregation</th>
            <td>{{ task.trainingInformation.minNbOfParticipants }}</td>
          </tr>
          <tr v-if="task.dataType === 'image'">
            <th>Height of image (pixels)</th>
            <td>{{ (task as Task<"image">).trainingInformation.IMAGE_H }}</td>
          </tr>
          <tr v-if="task.dataType === 'image'">
            <th>Width of image (pixels)</th>
            <td>{{ (task as Task<"image">).trainingInformation.IMAGE_W }}</td>
          </tr>
          <tr v-if="task.dataType === 'image'">
            <th>List of labels</th>
            <td>
              {{
                (task as Task<"image">).trainingInformation.LABEL_LIST.join(
                  ", ",
                )
              }}
            </td>
          </tr>
        </tbody>
        <tbody>
          <tr>
            <th colspan="2" class="text-slate-600 dark:text-slate-200">
              Privacy
            </th>
          </tr>
          <tr>
            <th>Differential Privacy: Noise Scale</th>
            <td>
              {{ task.trainingInformation.privacy?.noiseScale ?? "Unused" }}
            </td>
          </tr>
          <tr>
            <th>Differential Privacy: Clipping Radius</th>
            <td>
              {{ task.trainingInformation.privacy?.clippingRadius ?? "Unused" }}
            </td>
          </tr>
          <tr>
            <th>Maximum Value of Shares used in Secure Aggregation</th>
            <td>{{ task.trainingInformation.maxShareValue ?? "Unused" }}</td>
          </tr>
        </tbody>
      </table>
    </DropdownCard>
  </div>
</template>

<style lang="css" scoped>
th[colspan] {
  font-weight: bold;
}
th {
  font-weight: normal; /* webkit makes it bold */
  text-align: left;
}

tr:not(:first-child) > * {
  padding-left: 1rem;
}
</style>

<script lang="ts" setup>
import type { DataType, Task } from "@epfml/discojs";

import IconCard from "@/components/containers/IconCard.vue";
import DropdownCard from "@/components/containers/DropdownCard.vue";
import ModelIcon from "@/assets/svg/ModelIcon.vue";

const props = defineProps<{
  task: Task<DataType>;
}>();
</script>

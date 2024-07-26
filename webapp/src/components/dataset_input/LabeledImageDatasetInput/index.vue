<template>
  <div class="grid grid-cols-1">
    <DatasetInput>
      <div class="mb-5 text-left">
        You can connect images by selecting the location of each data category
        (Group) or by submitting a csv file (CSV).
      </div>

      <div class="flex justify-center">
        <button
          class="w-40 py-2 uppercase text-lg rounded-l-lg border-2 border-disco-cyan focus:outline-none"
          :class="
            connectImagesByGroup
              ? 'text-white bg-disco-cyan'
              : 'text-disco-cyan bg-transparent'
          "
          @click="connectImagesByGroup = true"
        >
          group
        </button>
        <button
          class="w-40 py-2 uppercase text-lg rounded-r-lg border-2 border-disco-cyan focus:outline-none"
          :class="
            !connectImagesByGroup
              ? 'text-white bg-disco-cyan'
              : 'text-disco-cyan bg-transparent'
          "
          @click="connectImagesByGroup = false"
        >
          csv
        </button>
      </div>
    </DatasetInput>

    <div class="space-y-4 md:space-y-8 mt-8">
      <ByGroup
        v-show="connectImagesByGroup"
        :labels="labels"
        :datasetBuilder="datasetBuilder"
      />
      <ByCSV
        v-show="!connectImagesByGroup"
        :task="task"
        :datasetBuilder="datasetBuilder"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: "LabeledImageDatasetInput" });

import { Set } from "immutable";
import { computed, ref } from "vue";

import type { Task } from "@epfml/discojs";
import { data } from "@epfml/discojs";

import DatasetInput from "../DatasetInput.vue";

import ByCSV from "./ByCSV.vue";
import ByGroup from "./ByGroup.vue";

const props = defineProps<{
  task: Task;
  datasetBuilder: data.DatasetBuilder<File>;
}>();

const labels = computed(() => {
  const ret = props.task.trainingInformation.LABEL_LIST;
  if (ret === undefined) throw new Error("image task without labels");
  return Set(ret);
});

const isLabelLengthSmall =
  (props.task.trainingInformation.LABEL_LIST?.length ?? 0) <= 2;
const connectImagesByGroup = ref(isLabelLengthSmall);
</script>

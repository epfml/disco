<template>
  <div
    class="mx-auto w-full max-w-card lg:max-w-cards-2 flex flex-col cards-gap"
  >
    <DatasetInput>
      <div class="mb-5 text-left">
        You can connect images by selecting the location of each data category
        (Group) or by submitting a csv file (CSV).
      </div>

      <div class="flex justify-center tuto-data-method">
        <button
          id="tuto-group-bttn"
          class="w-40 py-2 uppercase text-lg rounded-l-lg border-2 border-disco-cyan focus:outline-hidden"
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
          id="csv-file-bttn"
          class="w-40 py-2 uppercase text-lg rounded-r-lg border-2 border-disco-cyan focus:outline-hidden"
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

    <ByGroup
      v-if="connectImagesByGroup"
      v-model="dataset"
      :labels="labels"
      class="group-data-field"
    />
    <ByCSV v-else v-model="dataset" />
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: "LabeledImageDatasetInput" });

// Vue turns immutable Set into the native JS Set
import type { Set as ImmutableSet } from "immutable";
import { ref } from "vue";

import DatasetInput from "../DatasetInput.vue";
import type { NamedLabeledImageDataset } from "../types.js";

import ByCSV from "./ByCSV.vue";
import ByGroup from "./ByGroup.vue";

const props = defineProps<{
  labels: ImmutableSet<string>;
}>();

const dataset = defineModel<NamedLabeledImageDataset>();

const connectImagesByGroup = ref(props.labels.size <= 2);
</script>

<template>
  <div v-if="task === undefined">loading task</div>
  <div v-else>
    <Description v-if="trainingStore.step === 1" :task="task" />

    <Data
      v-else-if="trainingStore.step === 2"
      :task="task"
      @dataset="setDataset"
    />

    <Trainer
      v-else-if="trainingStore.step === 3 && dataset !== undefined"
      :task="task"
      :dataset="dataset"
    />

    <Finished v-else-if="trainingStore.step === 4" :task="task" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import type { Image, TaskID, TypedDataset } from "@epfml/discojs";

import { useTrainingStore } from "@/store/training";
import { useTasksStore } from "@/store/tasks";
import type { TypedNamedDataset } from "@/components/data/Data.vue";
import Data from "@/components/data/Data.vue";
import Description from "./Description.vue";
import Finished from "./Finished.vue";
import Trainer from "./Trainer.vue";

const props = defineProps<{
  id: TaskID;
}>();

onMounted(() => {
  trainingStore.setTask(props.id);
  trainingStore.setStep(1);
});

const router = useRouter();
const trainingStore = useTrainingStore();
const tasksStore = useTasksStore();

const task = computed(() => {
  const loaded = tasksStore.tasks.get(props.id);
  if (loaded === undefined) {
    router.replace({ name: "not-found" }); // TODO should be awaited
    return undefined;
  }
  return loaded;
});

const dataset = ref<TypedDataset>();

function setDataset(value: TypedNamedDataset | undefined): void {
  if (value === undefined) {
    dataset.value = undefined;
    return;
  }
  dataset.value = convert(value);

  function convert([t, namedDataset]: TypedNamedDataset): TypedDataset {
    switch (t) {
      case "image":
        return [
          "image",
          namedDataset.map<[Image, string]>(({ image, label }) => [
            image,
            label,
          ]),
        ];
      case "tabular":
        return ["tabular", namedDataset];
      case "text":
        return ["text", namedDataset];
    }
  }
}
</script>

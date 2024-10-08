<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 items-stretch">
    <!-- Save the model -->
    <ButtonsCard :buttons="List.of(['test model', onTestModel])">
      <template #title> Test the model </template>

      Check the performance of your <DISCOllaborative /> trained model by
      testing it on new data (that was not used in training).
    </ButtonsCard>

    <!-- Test the model -->
    <ButtonsCard :buttons="List.of(['save model', onSaveModel])">
      <template #title> Save the model </template>

      Saving the model will allow you to access it later to update training in a
      new <DISCOllaborative />.
    </ButtonsCard>
  </div>
</template>

<script setup lang="ts">
import { List } from "immutable";
import { ref, toRaw, watch } from "vue";
import { useRouter } from "vue-router";

import type { Model, Task } from "@epfml/discojs";

import { useToaster } from "@/composables/toaster";
import type { ModelID } from "@/store";
import { useModelsStore } from "@/store";
import { useValidationStore } from "@/store";

import ButtonsCard from "@/components/containers/ButtonsCard.vue";
import DISCOllaborative from "@/components/simple/DISCOllaborative.vue";

const modelsStore = useModelsStore();
const validationStore = useValidationStore();
const router = useRouter();
const toaster = useToaster();

const props = defineProps<{
  task: Task;
  model?: Model;
}>();

const saved = ref<ModelID>();
watch(props, () => (saved.value = undefined));

/** add model to store */
async function saveModel(): Promise<void> {
  if (props.model === undefined) {
    toaster.error("Model was not trained");
    return;
  }

  // avoid multiple save
  if (saved.value !== undefined) return;
  saved.value = await modelsStore.add(props.task.id, toRaw(props.model));
}

async function onSaveModel(): Promise<void> {
  await saveModel();
  if (saved.value === undefined) return; // error toast already shown

  toaster.success(
    `The trained ${props.task.displayInformation.taskTitle} model has been saved.`,
  );
}

async function onTestModel() {
  await saveModel();
  if (saved.value === undefined) return; // error toast already shown

  validationStore.modelID = saved.value;
  router.push({ path: "/evaluate" });
}
</script>

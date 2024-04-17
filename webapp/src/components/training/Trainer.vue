<template>
  <div class="space-y-4 md:space-y-8">
    <!-- If a cached model exists, display it -->
    <div v-if="displayModelCaching">
      <ModelCaching :task="task" />
    </div>
    <!-- Train Button -->
    <div class="flex justify-center">
      <IconCard title-placement="center">
        <template #title> Control the Training Flow </template>
        <template v-if="trainingGenerator === undefined" #content>
          <div class="grid grid-cols-2 gap-8">
            <CustomButton @click="startTraining(false)">
              train alone
            </CustomButton>
            <CustomButton @click="startTraining(true)">
              train collaboratively
            </CustomButton>
          </div>
        </template>
        <template v-else #content>
          <div class="flex justify-center">
            <CustomButton @click="stopTraining()"> stop training </CustomButton>
          </div>
        </template>
      </IconCard>
    </div>
    <!-- Training Board -->
    <div>
      <TrainingInformation
        :logs="logs"
        :has-validation-data="hasValidationData"
        :messages="messages"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { List } from "immutable";
import { computed, ref, toRaw } from "vue";

import type { RoundLogs, Task, TypedDataset } from "@epfml/discojs";
import { EmptyMemory, Disco } from "@epfml/discojs";
import { IndexedDB } from "@epfml/discojs-web";

import { getClient } from "@/clients";
import { useMemoryStore } from "@/store/memory";
import { useToaster } from "@/composables/toaster";
import ModelCaching from "./ModelCaching.vue";
import TrainingInformation from "@/components/training/TrainingInformation.vue";
import CustomButton from "@/components/simple/CustomButton.vue";
import IconCard from "@/components/containers/IconCard.vue";

const props = defineProps<{
  task: Task;
  dataset: TypedDataset;
}>();

const toaster = useToaster();
const memoryStore = useMemoryStore();

const displayModelCaching = ref(true);

const trainingGenerator =
  ref<AsyncGenerator<RoundLogs & { participants: number }, void>>();
const logs = ref(List<RoundLogs & { participants: number }>());
const messages = ref(List<string>());

const hasValidationData = computed(
  () => props.task.trainingInformation.validationSplit > 0,
);

async function startTraining(distributed: boolean): Promise<void> {
  // Reset training information before starting a new training
  trainingGenerator.value = undefined;
  logs.value = List<RoundLogs & { participants: number }>();
  messages.value = List<string>();

  toaster.info("Model training started");

  const scheme = distributed ? props.task.trainingInformation.scheme : "local";
  const client = getClient(scheme, props.task);

  const disco = new Disco(props.task, {
    logger: {
      success: (msg: string) => {
        messages.value = messages.value.push(msg);
      },
      error: (msg: string) => {
        messages.value = messages.value.push(msg);
      },
    },
    memory: memoryStore.useIndexedDB ? new IndexedDB() : new EmptyMemory(),
    scheme,
    client,
  });

  try {
    displayModelCaching.value = false; // hide model caching buttons during training
    // Vue proxy doesn't work with Dataset's private fields
    trainingGenerator.value = disco.fit(toRaw(props.dataset));
    logs.value = List<RoundLogs & { participants: number }>();
    for await (const roundLogs of trainingGenerator.value)
      logs.value = logs.value.push(roundLogs);

    if (trainingGenerator.value === undefined) {
      toaster.info("Training stopped");
      return;
    }
  } catch (e) {
    toaster.error("An error occurred during training");
    console.error(e);
    return;
  } finally {
    displayModelCaching.value = true; // show model caching buttons again after training
    trainingGenerator.value = undefined;
  }

  toaster.success("Training successfully completed");
}

async function stopTraining(): Promise<void> {
  const generator = trainingGenerator.value;
  if (generator === undefined) return;

  trainingGenerator.value = undefined;
  generator.return();
}
</script>

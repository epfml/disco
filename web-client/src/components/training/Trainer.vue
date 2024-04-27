<template>
  <div class="space-y-4 md:space-y-8">
    <!-- Train Button -->
    <div class="flex justify-center">
      <IconCard title-placement="center" class="w-3/5">
        <template #title> Control the Training Flow </template>
        <template v-if="training === undefined" #content>
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
import { ref, computed } from "vue";

import type { RoundLogs, Task } from "@epfml/discojs-core";
import {
  aggregator as aggregators,
  client as clients,
  data,
  EmptyMemory,
  Disco,
} from "@epfml/discojs-core";
import { IndexedDB } from "@epfml/discojs";

import { CONFIG } from "@/config";
import { useMemoryStore } from "@/store/memory";
import { useToaster } from "@/composables/toaster";
import TrainingInformation from "@/components/training/TrainingInformation.vue";
import CustomButton from "@/components/simple/CustomButton.vue";
import IconCard from "@/components/containers/IconCard.vue";

const toaster = useToaster();
const memoryStore = useMemoryStore();

const props = defineProps<{
  task: Task;
  datasetBuilder: data.DatasetBuilder<File>;
}>();

const training =
  ref<AsyncGenerator<RoundLogs & { participants: number }, void>>();
const logs = ref(List<RoundLogs & { participants: number }>());
const messages = ref(List<string>());

const hasValidationData = computed(
  () => props.task.trainingInformation.validationSplit > 0,
);

async function startTraining(distributed: boolean): Promise<void> {
  let dataset: data.DataSplit;
  try {
    dataset = await props.datasetBuilder.build({
      shuffle: false,
      validationSplit: props.task.trainingInformation.validationSplit,
    });
  } catch (e) {
    console.error(e);
    if (
      e instanceof Error &&
      e.message.includes(
        "provided in columnConfigs does not match any of the column names",
      )
    ) {
      // missing field is specified between two "quotes"
      const missingFields: String = e.message.split('"')[1].split('"')[0];
      toaster.error(`The input data is missing the field "${missingFields}"`);
    } else {
      toaster.error(
        "Incorrect data format. Please check the expected format at the previous step.",
      );
    }
    return;
  }

  toaster.info("Model training started");

  const scheme = distributed ? props.task.trainingInformation.scheme : "local";
  const client =
    scheme === "local"
      ? new clients.Local(
          CONFIG.serverUrl,
          props.task,
          new aggregators.MeanAggregator(),
        )
      : new clients.federated.FederatedClient(
          CONFIG.serverUrl,
          props.task,
          new aggregators.MeanAggregator(),
        );

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
    training.value = disco.fit(dataset);
    for await (const roundLogs of training.value)
      logs.value = logs.value.push(roundLogs);

    if (training.value === undefined) {
      toaster.success("Training stopped");
      return;
    }
  } catch (e) {
    toaster.error("An error occurred during training");
    console.error(e);
  } finally {
    training.value = undefined;
  }

  toaster.success("Training successfully completed");
}

async function stopTraining(): Promise<void> {
  const generator = training.value;
  if (generator === undefined) return;

  training.value = undefined;
  generator.return();
}
</script>

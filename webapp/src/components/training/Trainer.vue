<template>
  <div class="space-y-4 md:space-y-8">
    <!-- If a cached model exists, display it -->
    <div v-if="displayModelCaching">
      <ModelCaching
        :task="task"
      />
    </div>
    <!-- Train Button -->
    <div class="flex justify-center">
      <IconCard title-placement="center">
        <template #title> Control the Training Flow </template>
        <template v-if="trainingGenerator === undefined" #content>
          <div class="grid grid-cols-2 gap-8">
            <CustomButton @click="startTraining(false)">
              train alone
              <template #description>
                Train on your own
              </template>
            </CustomButton>
            <CustomButton @click="startTraining(true)">
              train collaboratively
              <template #description>
                Share the model's weights with other participants
              </template>
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
    <!-- Demo warning -->
    <div class="flex flex-row justify-between gap-x-4 items-center mb-5 py-4 px-4 bg-purple-100 rounded-md">
        <InfoIcon custom-class="min-w-6 min-h-6 w-6 h-6 text-slate-600"/>
        <p class="text-slate-600 text-xs pt-0.5">In this live demo, the model you are training is a newly initialized one. 
          In a real use case you would start training with the latest model resulting from all users' collaborative training. 
          To persist collaborative models, you can launch your own DISCO instance following
          <a
          class='underline text-blue-400 font-bold'
          target="_blank"
          href="https://github.com/epfml/disco/blob/develop/DEV.md"
          >these steps.</a>
          <!-- Warning about the maximum nb of iteration per epoch for LLMs -->
          <span 
            v-if="props.task.trainingInformation.dataType === 'text'" 
            class="text-slate-600 text-xs"
          >
          <!-- Leading space is important -->
           Additionally, when training language models we have limited the number of batches per epoch to 10.
          </span>
        </p>
    </div>
    <!-- Training Board -->
    <div>
      <TrainingInformation
        :rounds="roundsLogs"
        :epochs-of-round="epochsOfRoundLogs"
        :number-of-epochs="task.trainingInformation.epochs"
        :batches-of-epoch="batchesOfEpochLogs"
        :has-validation-data="hasValidationData"
        :messages="messages"
        :is-training="isTraining"
        :is-training-alone="isTrainingAlone"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { List } from "immutable";
import { ref, computed } from "vue";

import type { BatchLogs, EpochLogs, RoundLogs, Task } from "@epfml/discojs";
import { async_iterator, data, EmptyMemory, Disco } from "@epfml/discojs";
import { IndexedDB } from "@epfml/discojs-web";

import { getClient } from '@/clients'
import { useMemoryStore } from "@/store/memory";
import { useToaster } from "@/composables/toaster";
import ModelCaching from './ModelCaching.vue'
import TrainingInformation from "@/components/training/TrainingInformation.vue";
import CustomButton from "@/components/simple/CustomButton.vue";
import IconCard from "@/components/containers/IconCard.vue";
import InfoIcon from "@/assets/svg/InfoIcon.vue";

const toaster = useToaster();
const memoryStore = useMemoryStore();

const props = defineProps<{
  task: Task;
  datasetBuilder: data.DatasetBuilder<File>;
}>();

const displayModelCaching = ref(true)

const trainingGenerator =
  ref<
    AsyncGenerator<
      AsyncGenerator<
        AsyncGenerator<BatchLogs, EpochLogs>,
        RoundLogs & { participants: number }
      >
    >
  >();
const roundGenerator =
  ref<
      AsyncGenerator<
        AsyncGenerator<BatchLogs, EpochLogs>,
        RoundLogs & { participants: number }
      >
  >();
const epochGenerator = ref<AsyncGenerator<BatchLogs, EpochLogs>>();
const roundsLogs = ref(List<RoundLogs & { participants: number }>());
const epochsOfRoundLogs = ref(List<EpochLogs>());
const batchesOfEpochLogs = ref(List<BatchLogs>());
const messages = ref(List<string>());

const hasValidationData = computed(
  () => props.task.trainingInformation.validationSplit > 0,
);

const isTraining = ref(false)
const isTrainingAlone = ref(false)

const stopper = new Error("stop training")

async function startTraining(distributed: boolean): Promise<void> {
  isTraining.value = true
  isTrainingAlone.value = !distributed
  console.log(isTraining.value, isTrainingAlone.value)
  // Reset training information before starting a new training
  trainingGenerator.value = undefined
  roundsLogs.value = List<RoundLogs & { participants: number }>()
  epochsOfRoundLogs.value = List<EpochLogs>()
  batchesOfEpochLogs.value = List<BatchLogs>()
  messages.value = List()

  let dataset: data.DataSplit;
  try {
    dataset = await props.datasetBuilder.build({
      shuffle: true,
      validationSplit: props.task.trainingInformation.validationSplit,
    });
  } catch (e) {
    console.error(e);
    if (
      e instanceof Error &&
      e.message.includes("provided in columnConfigs does not match any of the column names")
    ) {
      // missing field is specified between two "quotes"
      const missingFields: String = e.message.split('"')[1].split('"')[0];
      toaster.error(`The input data is missing the field "${missingFields}"`);
    } else if (e instanceof Error && e.message.includes("No input files connected")) {
      toaster.error("First connect your data at the previous step.")
    } else {
      toaster.error(
        "Incorrect data format. Please check the expected format at the previous step.",
      );
    }
    isTraining.value = false
    return;
  }

  toaster.info("Model training started");

  const scheme = distributed ? props.task.trainingInformation.scheme : "local";
  const client = getClient(scheme, props.task)

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
    displayModelCaching.value = false // hide model caching buttons during training
    trainingGenerator.value = disco.train(dataset);

    roundsLogs.value = List<RoundLogs & { participants: number }>()
    for await (const round of trainingGenerator.value) {
      const [roundGen, roundLogs] = async_iterator.split(round)

      roundGenerator.value = roundGen
      for await (const epoch of roundGenerator.value) {
        const [epochGen, epochLogs] = async_iterator.split(epoch)

        epochGenerator.value = epochGen
        for await (const batch of epochGenerator.value)
          batchesOfEpochLogs.value = batchesOfEpochLogs.value.push(batch);

        epochsOfRoundLogs.value = epochsOfRoundLogs.value.push(await epochLogs)
        batchesOfEpochLogs.value = List<BatchLogs>()
      }

      roundsLogs.value = roundsLogs.value.push(await roundLogs)
      epochsOfRoundLogs.value = List<EpochLogs>()
    }
  } catch (e) {
    if (e === stopper) {
      toaster.info("Training stopped");
      return
    } else if (e instanceof Error && e.message.includes("greater than WebGL maximum on this browser")) {
      toaster.error("Unfortunately your browser doesn't support training this task.<br/>If you are on Firefox try using Chrome instead.")
    } else if (e instanceof Error && e.message.includes("loss is undefined or nan")) {
      toaster.error("Training is not converging. Data potentially needs better preprocessing.")
    } else {
      toaster.error("An error occurred during training");
    }
    console.error(e);
    return
  } finally {
    displayModelCaching.value = true // show model caching buttons again after training
    trainingGenerator.value = undefined;
    isTraining.value = false
  }

  toaster.success("Training successfully completed");
}

async function stopTraining(): Promise<void> {
  trainingGenerator.value?.throw(stopper);
  trainingGenerator.value = undefined;

  roundGenerator.value?.throw(stopper);
  roundGenerator.value = undefined;

  epochGenerator.value?.throw(stopper);
  epochGenerator.value = undefined;
}
</script>

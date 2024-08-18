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

        <div v-if="trainingGenerator === undefined">
          <div class="grid grid-cols-2 gap-8">
            <CustomButton @click="startTraining(false)">
              train alone
            </CustomButton>
            <CustomButton
              v-tippy="{
                content: 'Note that if you are the only participant the training will not be collaborative. You can open multiple tabs to emulate different participants by yourself.',
                placement: 'right'
              }"
              @click="startTraining(true)"
            >
              train collaboratively
              <template #description>
                Share the model's weights with other participants
              </template>
            </CustomButton>
          </div>
        </div>
        <div v-else>
          <div class="flex justify-center">
            <CustomButton @click="stopTraining()"> stop training </CustomButton>
          </div>
        </div>
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
import createDebug from "debug";
import { List } from "immutable";
import { ref, computed } from "vue";

import type { BatchLogs, EpochLogs, RoundLogs, Task } from "@epfml/discojs";
import { async_iterator, data, EmptyMemory, Disco } from "@epfml/discojs";
import { IndexedDB } from "@epfml/discojs-web";

import { useMemoryStore } from "@/store/memory";
import { useToaster } from "@/composables/toaster";
import ModelCaching from './ModelCaching.vue'
import TrainingInformation from "@/components/training/TrainingInformation.vue";
import CustomButton from "@/components/simple/CustomButton.vue";
import IconCard from "@/components/containers/IconCard.vue";
import InfoIcon from "@/assets/svg/InfoIcon.vue";
import { CONFIG } from '../../config'

const debug = createDebug("webapp:training:Trainer");
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
        RoundLogs
      >
    >
  >();
const roundGenerator =
  ref<
      AsyncGenerator<
        AsyncGenerator<BatchLogs, EpochLogs>,
        RoundLogs
      >
  >();
const epochGenerator = ref<AsyncGenerator<BatchLogs, EpochLogs>>();
const roundsLogs = ref(List<RoundLogs>());
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
  // Reset training information before starting a new training
  trainingGenerator.value = undefined
  roundsLogs.value = List<RoundLogs>()
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
    debug("while building dataset: %o", e);
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

  const disco = await Disco.fromTask(props.task, CONFIG.serverUrl, {
    logger: {
      success: (msg: string) => {
        messages.value = messages.value.push(msg);
      },
      error: (msg: string) => {
        messages.value = messages.value.push(msg);
      },
    },
    memory: memoryStore.useIndexedDB ? new IndexedDB() : new EmptyMemory(),
    scheme: distributed ? props.task.trainingInformation.scheme : "local",
  });

  try {
    displayModelCaching.value = false // hide model caching buttons during training
    trainingGenerator.value = disco.train(dataset);

    roundsLogs.value = List<RoundLogs>()
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
    debug("while training: %o", e);
    return;
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

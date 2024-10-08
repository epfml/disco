<template>
  <div class="space-y-4 md:space-y-8">
    <!-- Train Button -->
    <div class="flex justify-center">
      <IconCard title-placement="center" fill-space>
        <template #title> Control the Training Flow </template>
          <!-- If we are not currently training -->
          <div v-if="!isTraining" class="flex flex-col gap-y-4">
            <!-- Toggle buttons between training collaboratively and locally -->
            <div class="flex justify-center">
              <button
                id="train-collaboratively-bttn"
                class="w-60 py-1 uppercase text-lg rounded-l-lg border-2 border-disco-cyan focus:outline-none"
                :class="isTrainingAlone ? 'text-disco-cyan bg-transparent' : 'text-white bg-disco-cyan'"
                @click="isTrainingAlone = false"
                v-tippy="{
                  content: 'Exchange model updates with other participants',
                  placement: 'left'
                }"
              >
                collaboratively
              </button>
              <button
                id="training-locally-bttn"
                class="w-60 py-1 uppercase text-lg rounded-r-lg border-2 border-disco-cyan focus:outline-none"
                :class="isTrainingAlone ? 'text-white bg-disco-cyan': 'text-disco-cyan bg-transparent'"
                @click="isTrainingAlone = true"
                v-tippy="{
                  content: 'Train by yourself',
                  placement: 'right'
                }"
              >
                locally
              </button>
            </div>
            <!-- Start training button -->
            <div class="flex justify-center">
              <button
                id="start-training-bttn"
                type="button"
                @click="startTraining()"
                class="
                mt-4 px-6 py-2 min-w-[8rem]
                text-xl uppercase text-white
                bg-orange-400 rounded duration-200
                hover:bg-white hover:outline hover:outline-orange-400 hover:outline-2 hover:text-orange-400"
              >
                start training
              </button>
            </div>
          </div>
          <!-- If we are currently training -->
          <div v-else class="flex flex-col justify-center items-center gap-y-4">
            <!-- Display the training status if defined -->
            <div v-if="roundStatus !== undefined && roundStatus.length > 0">
              <span class="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase">Status</span>
              <span class="ml-5 font-mono text-md font-medium leading-none tracking-wider text-gray-600">{{ roundStatus }}</span>
            </div>
            <!-- Display an activity indicator depending on the training status -->
            <div class="min-h-9">
              <div v-if="roundStatus === 'Waiting for more participants' ||
                roundStatus === 'Establishing peer-to-peer connections'"
              >
                <VueSpinnerPuff size="30" color="#6096BA"/>
              </div>
              <div v-else>
                <VueSpinnerGears size="30" color="#6096BA"/>
              </div>
            </div>
            <!-- Stop training button -->
            <div>
              <CustomButton @click="stopTraining()"> stop training </CustomButton>
            </div>
          </div>
      </IconCard>
    </div>
    <!-- Demo warning -->
    <div
      class="flex flex-row justify-between gap-x-4 items-center mb-5 py-4 px-4 bg-purple-100 rounded-md"
    >
      <InfoIcon custom-class="min-w-6 min-h-6 w-6 h-6 text-slate-600" />
      <p class="text-slate-600 text-xs pt-0.5">
        In this live demo, the model you are training is a newly initialized
        one. In a real use case you would start training with the latest model
        resulting from all users' collaborative training. To persist
        collaborative models, you can launch your own DISCO instance following
        <a
          class="underline text-blue-400 font-bold"
          target="_blank"
          href="https://github.com/epfml/disco/blob/develop/DEV.md"
          >these steps</a>.
          <!-- Warning about the maximum nb of iteration per epoch for LLMs -->
          <span
            v-if="props.task.trainingInformation.dataType === 'text'"
            class="text-slate-600 text-xs"
          >
          <!-- Leading space is important -->
          Additionally, when training language models we have limited the number
          of batches per epoch to 10.
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
import { List, Map } from "immutable";
import { computed, ref, toRaw } from "vue";

import type {
  BatchLogs,
  EpochLogs,
  Model,
  RoundLogs,
  RoundStatus,
  Task,
  TypedLabeledDataset,
} from "@epfml/discojs";
import { async_iterator, Disco } from "@epfml/discojs";

import { useToaster } from "@/composables/toaster";
import TrainingInformation from "@/components/training/TrainingInformation.vue";
import CustomButton from "@/components/simple/CustomButton.vue";
import IconCard from "@/components/containers/IconCard.vue";
import InfoIcon from "@/assets/svg/InfoIcon.vue";
import { CONFIG } from '../../config'
import { VueSpinnerPuff, VueSpinnerGears } from 'vue3-spinners';

const debug = createDebug("webapp:training:Trainer");
const toaster = useToaster();

const props = defineProps<{
  task: Task;
  dataset?: TypedLabeledDataset;
}>();
const emit = defineEmits<{
  model: [Model];
}>();

const trainingGenerator =
  ref<
    AsyncGenerator<
      AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>
    >
  >();
const roundGenerator =
  ref<AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>>();
const epochGenerator = ref<AsyncGenerator<BatchLogs, EpochLogs>>();
const roundsLogs = ref(List<RoundLogs>());
const epochsOfRoundLogs = ref(List<EpochLogs>());
const batchesOfEpochLogs = ref(List<BatchLogs>());
const messages = ref(List<string>());
const roundStatus = ref<string>();
/**
 * Store a disco cleanup callback to make sure it can be ran if users
 * manually stop the training.
 */
const cleanupDisco = ref<() => Promise<void>>();

const hasValidationData = computed(
  () => props.task.trainingInformation.validationSplit > 0,
);

const isTraining = computed(() => trainingGenerator.value !== undefined);
const isTrainingAlone = ref(false);

// value to throw in generator to stop training
// TODO better to use an AbortController but if the training fails somehow, it never returns
const stopper = new Error("stop training");

async function startTraining(): Promise<void> {
  // Reset training information before starting a new training
  trainingGenerator.value = undefined;
  roundsLogs.value = List<RoundLogs>();
  epochsOfRoundLogs.value = List<EpochLogs>();
  batchesOfEpochLogs.value = List<BatchLogs>();
  messages.value = List();

  // Vue proxy doesn't work with Dataset's private fields
  const dataset = toRaw(props.dataset);
  if (dataset === undefined) {
    toaster.error("First connect your data at the previous step.");
    return;
  }

  toaster.info("Model training started");

  const disco = new Disco(props.task, CONFIG.serverUrl, {
    logger: {
      success: (msg: string) => messages.value = messages.value.push(msg),
      error: (msg: string) => messages.value = messages.value.push(msg)
    },
    scheme: isTrainingAlone.value ? "local": props.task.trainingInformation.scheme,
  });
  // set the round status displayed to the status emitted by the disco object
  const discoStatusMessage = Map<RoundStatus, string>({
    'not enough participants': "Waiting for more participants",
    'connecting to peers': "Establishing peer-to-peer connections",
    'updating model': "Updating the model with other participants' models",
    'local training': "Training the model on the data you connected"
  })
  disco.on("status", status => { roundStatus.value = discoStatusMessage.get(status) })

  // Store the cleanup function such that it can be ran if users
  // manually interrupt the training
  cleanupDisco.value = async () => await disco.close()

  try {
    trainingGenerator.value = disco.train(dataset);

    roundsLogs.value = List<RoundLogs>();
    for await (const round of trainingGenerator.value) {
      const [roundGen, roundLogs] = async_iterator.split(round);

      roundGenerator.value = roundGen;
      for await (const epoch of roundGenerator.value) {
        const [epochGen, epochLogs] = async_iterator.split(epoch);

        epochGenerator.value = epochGen;
        for await (const batch of epochGenerator.value)
          batchesOfEpochLogs.value = batchesOfEpochLogs.value.push(batch);

        epochsOfRoundLogs.value = epochsOfRoundLogs.value.push(await epochLogs);
        batchesOfEpochLogs.value = List<BatchLogs>();
      }

      roundsLogs.value = roundsLogs.value.push(await roundLogs);
      epochsOfRoundLogs.value = List<EpochLogs>();
    }
  } catch (e) {
    if (e === stopper) {
      toaster.info("Training stopped");
      return;
    } else if (
      e instanceof Error &&
      e.message.includes("greater than WebGL maximum on this browser")
    ) {
      toaster.error(
        "Unfortunately your browser doesn't support training this task.<br/>If you are on Firefox try using Chrome instead.",
      );
    } else if (
      e instanceof Error &&
      e.message.includes("loss is undefined or nan")
    ) {
      toaster.error(
        "Training is not converging. Data potentially needs better preprocessing.",
      );
    } else {
      toaster.error("An error occurred during training");
    }
    debug("while training: %o", e);
  } finally {
    emit("model", disco.trainer.model);
    await cleanupTrainingSession()
  }

  toaster.success("Training successfully completed");
}

async function cleanupTrainingSession() {
  trainingGenerator.value = undefined;
  // check if a cleanup callback has been initialized
  if (cleanupDisco.value === undefined) return
  // create a local copy and set cleanupTrainingSessionFn to undefined
  // to make sure we only call the cleanup function once
  const cleanup = cleanupDisco.value
  cleanupDisco.value = undefined
  // Calling the cleanup function returns a promise
  // awaiting the promise notifies the network that we are disconnecting
  await cleanup()
}

async function stopTraining(): Promise<void> {
  trainingGenerator.value?.throw(stopper);
  trainingGenerator.value = undefined;

  roundGenerator.value?.throw(stopper);
  roundGenerator.value = undefined;

  epochGenerator.value?.throw(stopper);
  epochGenerator.value = undefined;

  // Cleanup the session, potentially already done if the
  // stopper error was caught
  await cleanupTrainingSession()
}
</script>

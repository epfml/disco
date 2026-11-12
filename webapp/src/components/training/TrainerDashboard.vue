<template>
  <div class="space-y-4 md:space-y-8">
    <!-- Train Button -->
    <div class="mx-auto w-full max-w-card tuto-train-dash">
      <IconCard title-placement="center">
        <template #title> Control the Training Flow </template>
        <!-- If we are not currently training -->
        <div v-if="!isTraining" class="flex flex-col gap-y-4 min-w-full">
          <!-- Toggle buttons between training collaboratively and locally -->
          <div class="flex justify-center">
            <button
              id="train-collab-bttn"
              v-tippy="{
                content: 'Exchange model updates with other participants',
                placement: 'left',
              }"
              class="w-60 py-1 capitalize text-lg font-disco rounded-l-full border-2 border-disco-cyan focus:outline-hidden"
              :class="
                isTrainingAlone
                  ? 'text-disco-cyan bg-transparent'
                  : 'text-white bg-disco-cyan'
              "
              @click="isTrainingAlone = false"
            >
              collaboratively
            </button>
            <button
              id="train-locally-bttn"
              v-tippy="{
                content: 'Train by yourself',
                placement: 'right',
              }"
              class="w-60 py-1 capitalize text-lg font-disco rounded-r-full border-2 border-disco-cyan focus:outline-hidden"
              :class="
                isTrainingAlone
                  ? 'text-white bg-disco-cyan'
                  : 'text-disco-cyan bg-transparent'
              "
              @click="isTrainingAlone = true"
            >
              locally
            </button>
          </div>
          <!-- Start training button -->
          <div class="flex justify-center">
            <button
              id="start-training-bttn"
              type="button"
              class="mt-4 px-6 py-2 min-w-32 text-xl text-white font-disco bg-disco-orange rounded-full duration-200 hover:bg-transparent hover:outline-solid hover:outline-disco-orange hover:outline-2 hover:text-disco-orange"
              @click="startTraining()"
            >
              Start training
            </button>
          </div>
        </div>
        <!-- If we are currently training -->
        <div v-else class="flex flex-col justify-center items-center gap-y-4">
          <!-- Display the training status if defined -->
          <div v-if="roundStatus !== undefined">
            <span
              class="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase"
              >Status</span
            >
            <span
              class="ml-5 font-mono text-md font-medium leading-none tracking-wider text-gray-600"
              >{{ roundStatus[1] }}</span
            >
          </div>
          <!-- Display an activity indicator depending on the training status -->
          <div class="min-h-9">
            <div
              v-if="
                roundStatus !== undefined &&
                (roundStatus[0] === 'connecting to peers' ||
                  roundStatus[0] === 'waiting for peers to share weights' ||
                  roundStatus[0] === 'not enough participants')
              "
            >
              <VueSpinnerPuff size="30" color="#6096BA" />
            </div>
            <div v-else>
              <VueSpinnerGears size="30" color="#6096BA" />
            </div>
          </div>
          <!-- Stop training button -->
          <div>
            <CustomButton @click="stopTraining()"> stop training </CustomButton>
          </div>
        </div>
      </IconCard>
    </div>
    <!-- Training Board -->
    <div>
      <TrainingInformation
        :rounds="roundsLogs"
        :epochs-of-round="epochsOfRoundLogs"
        :number-of-epochs="task.trainingInformation.epochs"
        :batches-of-epoch="batchesOfEpochLogs"
        :has-validation-data="hasValidationData"
        :is-training="isTraining"
        :is-training-alone="isTrainingLocally"
        :nb-participants="nbParticipants"
      />
    </div>
  </div>
</template>

<script lang="ts" setup generic="D extends DataType">
import createDebug from "debug";
import { List } from "immutable";
import { computed, onUnmounted, ref, toRaw } from "vue";

import type {
  BatchLogs,
  DataType,
  EpochLogs,
  Model,
  RoundLogs,
  RoundStatus,
  Task,
  Network,
} from "@epfml/discojs";
import {
  EpochLogs as EpochLogsClass,
  modelDecode,
  serializeTaskToJSON,
} from "@epfml/discojs";

import { useToaster } from "@/composables/toaster";
import TrainingInformation from "@/components/training/TrainingInformation.vue";
import CustomButton from "@/components/simple/CustomButton.vue";
import IconCard from "@/components/containers/IconCard.vue";
import { CONFIG } from "../../config";
import { VueSpinnerPuff, VueSpinnerGears } from "vue3-spinners";
import { servePeerTransport } from "./peer_transport";
import type { FromWorker, ToWorker } from "./worker_messages";

import type { DatasetSource } from "../dataset_input/source";

const debug = createDebug("webapp:training:Trainer");
const toaster = useToaster();

const props = defineProps<{
  task: Task<D, Network>;
  dataset?: DatasetSource;
}>();
const emit = defineEmits<{
  model: [Model<D>];
}>();

const roundsLogs = ref(List<RoundLogs>());
const epochsOfRoundLogs = ref(List<EpochLogs>());
const batchesOfEpochLogs = ref(List<BatchLogs>());
const roundStatus = ref<[RoundStatus, string]>();
const training = ref(false);
let worker: Worker | undefined;
let closePeerTransport: (() => void) | undefined;
let stopTimeout: ReturnType<typeof setTimeout> | undefined;

const hasValidationData = computed(
  () => props.task.trainingInformation.validationSplit > 0,
);

const isTraining = training;
const isTrainingAlone = ref(false);
// Whether the training involves no collaborator at all: either the user chose
// to train alone or the task itself is a local one
const isTrainingLocally = computed(
  () =>
    isTrainingAlone.value || props.task.trainingInformation.scheme === "local",
);
// number of participants in the training session
const nbParticipants = ref(1);

function startTraining(): void {
  if (worker !== undefined) return;
  // Reset training information before starting a new training
  roundsLogs.value = List<RoundLogs>();
  epochsOfRoundLogs.value = List<EpochLogs>();
  batchesOfEpochLogs.value = List<BatchLogs>();
  // the client tells us how many participants there are once connected,
  // until then we only know about ourselves
  nbParticipants.value = 1;

  // postMessage requires the plain source rather than Vue's reactive proxy.
  const dataset = toRaw(props.dataset);
  if (dataset === undefined) {
    toaster.error("First connect your data at the previous step.");
    return;
  }

  toaster.info("Model training started");

  const discoStatusMessage: Record<RoundStatus, string> = {
    "not enough participants": "Waiting for more participants",
    "waiting for peers to share weights":
      "Waiting for other participants to share their model updates",
    "connecting to peers": "Establishing peer-to-peer connections",
    "updating model": "Updating the model with other participants' models",
    "local training": "Training the model on the data you connected",
  };
  const active = new Worker(new URL("./training.worker.ts", import.meta.url), {
    type: "module",
  });
  worker = active;
  training.value = true;
  const scheme = isTrainingLocally.value
    ? "local"
    : props.task.trainingInformation.scheme;
  let peerPort: MessagePort | undefined;
  if (scheme === "decentralized") {
    const channel = new MessageChannel();
    closePeerTransport = servePeerTransport(channel.port1);
    peerPort = channel.port2;
  }
  active.onmessage = (event: MessageEvent<FromWorker>) => {
    if (worker !== active) return;
    const message = event.data;
    switch (message.type) {
      case "status":
        roundStatus.value = [
          message.status,
          discoStatusMessage[message.status],
        ];
        break;
      case "participants":
        nbParticipants.value = message.count;
        break;
      case "batch":
        batchesOfEpochLogs.value = batchesOfEpochLogs.value.push(message.log);
        break;
      case "epoch":
        epochsOfRoundLogs.value = epochsOfRoundLogs.value.push(
          new EpochLogsClass(
            message.batches,
            message.epochTime,
            message.validation,
          ),
        );
        batchesOfEpochLogs.value = List<BatchLogs>();
        break;
      case "round":
        roundsLogs.value = roundsLogs.value.push({
          participants: message.participants,
          preRoundValidation: message.preRoundValidation,
          postAggregationValidation: message.postAggregationValidation,
          epochs: epochsOfRoundLogs.value,
        });
        epochsOfRoundLogs.value = List<EpochLogs>();
        break;
      case "finished":
        void finishTraining(active, message);
        break;
      case "error":
        showTrainingError(
          Object.assign(new Error(message.message), {
            name: message.errorName ?? "Error",
          }),
        );
        closeWorker(active);
        break;
    }
  };
  active.onerror = (event) => {
    if (worker !== active) return;
    showTrainingError(new Error(event.message));
    closeWorker(active);
  };
  const start: ToWorker = {
    type: "start",
    task: serializeTaskToJSON(toRaw(props.task) as Task<DataType, Network>),
    serverUrl: CONFIG.serverUrl.toString(),
    dataset,
    scheme,
    peerPort,
  };
  try {
    active.postMessage(start, peerPort === undefined ? [] : [peerPort]);
  } catch (error) {
    peerPort?.close();
    showTrainingError(error);
    closeWorker(active);
  }
}

async function finishTraining(
  active: Worker,
  message: Extract<FromWorker, { type: "finished" }>,
): Promise<void> {
  try {
    if (message.model !== undefined) {
      const model = await modelDecode(message.model);
      if (worker !== active) {
        model.dispose();
        return;
      }
      emit("model", model as Model<D>);
    }
    if (message.stopped) toaster.info("Training stopped");
    else toaster.success("Training successfully completed");
  } catch (error) {
    showTrainingError(error);
  } finally {
    closeWorker(active);
  }
}

function showTrainingError(e: unknown): void {
  if (
    e instanceof Error &&
    e.name === "ClientCrashError" &&
    e.message.includes("Failed to connect to peers of the round")
  ) {
    toaster.error(
      "Client disconnected after multiple peer connection failures. Please rejoin the training.",
    );
  } else if (e instanceof Error && e.name === "ClientCrashError") {
    toaster.error(
      "The server has disconnected you due to an unexpected event.<br/> Feel free to rejoin the training.",
    );
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
  } else if (
    e instanceof Error &&
    e.message.includes("Timeout while waiting for the latest model")
  ) {
    toaster.error(
      "Timeout while waiting for the model syncing. Please rejoin the training.",
    );
  } else {
    toaster.error("An error occurred during training.");
  }
  debug("while training: %o", e);
}

function closeWorker(active: Worker): void {
  if (worker !== active) return;
  if (stopTimeout !== undefined) clearTimeout(stopTimeout);
  stopTimeout = undefined;
  active.terminate();
  closePeerTransport?.();
  closePeerTransport = undefined;
  worker = undefined;
  training.value = false;
}

function stopTraining(): void {
  const active = worker;
  if (active === undefined || stopTimeout !== undefined) return;
  active.postMessage({ type: "stop" } satisfies ToWorker);
  // A peer connection can be waiting indefinitely, so release the worker if
  // cooperative cancellation cannot reach the training loop.
  stopTimeout = setTimeout(() => {
    if (worker !== active) return;
    closeWorker(active);
    toaster.info("Training stopped");
  }, 10_000);
}
onUnmounted(() => {
  if (worker !== undefined) closeWorker(worker);
});
</script>

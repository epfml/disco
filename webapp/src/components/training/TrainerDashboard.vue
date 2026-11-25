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
            <CustomButton
              :disabled="phase.kind !== 'training'"
              @click="stopTraining()"
            >
              {{
                phase.kind === "training"
                  ? "stop training"
                  : phase.kind === "stopping"
                    ? "Stopping..."
                    : "Finishing..."
              }}
            </CustomButton>
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
import { computed, onUnmounted, ref, shallowRef, toRaw } from "vue";

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
  datasetSource?: DatasetSource;
}>();
const emit = defineEmits<{
  model: [Model<D>];
}>();

const roundsLogs = ref(List<RoundLogs>());
const epochsOfRoundLogs = ref(List<EpochLogs>());
const batchesOfEpochLogs = ref(List<BatchLogs>());
const roundStatus = ref<[RoundStatus, string]>();
interface Session {
  worker: Worker;
  closePeerTransport?: () => void;
  closed: Promise<string | undefined>;
  resolveClosed: (error?: string) => void;
}

type Phase =
  | { kind: "idle" }
  | { kind: "training"; session: Session }
  | {
      kind: "stopping";
      session: Session;
      timeout?: ReturnType<typeof setTimeout>;
    }
  | { kind: "finishing"; session: Session };

const phase = shallowRef<Phase>({ kind: "idle" });

const hasValidationData = computed(
  () => props.task.trainingInformation.validationSplit > 0,
);

const isTraining = computed(() => phase.value.kind !== "idle");
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
  if (phase.value.kind !== "idle") return;
  // Reset training information before starting a new training
  roundsLogs.value = List<RoundLogs>();
  epochsOfRoundLogs.value = List<EpochLogs>();
  batchesOfEpochLogs.value = List<BatchLogs>();
  // the client tells us how many participants there are once connected,
  // until then we only know about ourselves
  nbParticipants.value = 1;

  // postMessage requires the plain source rather than Vue's reactive proxy.
  const datasetSource = toRaw(props.datasetSource);
  if (datasetSource === undefined) {
    toaster.error("First connect your data at the previous step.");
    return;
  }

  toaster.info("Model training started");

  const scheme = isTrainingLocally.value
    ? "local"
    : props.task.trainingInformation.scheme;
  const { session, peerPort } = initWorker(scheme);
  const start: ToWorker = {
    type: "start",
    task: serializeTaskToJSON(toRaw(props.task) as Task<DataType, Network>),
    serverUrl: CONFIG.serverUrl.toString(),
    datasetSource,
    scheme,
    peerPort,
  };
  try {
    session.worker.postMessage(start, peerPort === undefined ? [] : [peerPort]);
  } catch (error) {
    peerPort?.close();
    showTrainingError(error);
    closeWorker(session);
  }
}

function isCurrentSession(session: Session): boolean {
  return phase.value.kind !== "idle" && phase.value.session === session;
}

function initWorker(scheme: Network): {
  session: Session;
  peerPort?: MessagePort;
} {
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
  let resolveClosed!: Session["resolveClosed"];
  const closed = new Promise<string | undefined>((resolve) => {
    resolveClosed = resolve;
  });
  const session: Session = { worker: active, closed, resolveClosed };
  let peerPort: MessagePort | undefined;
  if (scheme === "decentralized") {
    const channel = new MessageChannel();
    session.closePeerTransport = servePeerTransport(channel.port1);
    peerPort = channel.port2;
  }
  phase.value = { kind: "training", session };
  active.onmessage = (event: MessageEvent<FromWorker>) => {
    if (!isCurrentSession(session)) return;
    const message = event.data;
    switch (message.type) {
      case "stopping":
        // A responsive worker can finish its current operation without being killed.
        if (phase.value.kind === "stopping") {
          clearTimeout(phase.value.timeout);
          phase.value = { kind: "stopping", session };
        }
        break;
      case "closed":
        session.resolveClosed(message.error);
        break;
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
      case "error":
        void finishTraining(session, message);
        break;
    }
  };
  active.onerror = (event) => {
    if (!isCurrentSession(session)) return;
    if (phase.value.kind === "finishing") {
      session.resolveClosed(event.message);
      return;
    }
    showTrainingError(new Error(event.message));
    closeWorker(session);
  };
  return { session, peerPort };
}

async function finishTraining(
  session: Session,
  message: Extract<FromWorker, { type: "finished" | "error" }>,
): Promise<void> {
  // The worker has answered; model decoding must not race the stop watchdog.
  if (phase.value.kind === "stopping") clearTimeout(phase.value.timeout);
  phase.value = { kind: "finishing", session };
  // Report the training failure before decoding a possibly invalid partial model.
  if (message.type === "error")
    showTrainingError(
      Object.assign(new Error(message.message), {
        name: message.errorName ?? "Error",
      }),
    );
  // Peer draining is bounded at 10 seconds. Allow cleanup to finish after the
  // model has been returned, then terminate even if cleanup gets stuck.
  let cleanupTimeout: ReturnType<typeof setTimeout> | undefined;
  const cleanup = Promise.race([
    session.closed,
    new Promise<string>((resolve) => {
      cleanupTimeout = setTimeout(
        () => resolve("Worker cleanup timed out"),
        12_000,
      );
    }),
  ]);
  try {
    if (message.model !== undefined) {
      const model = await modelDecode(message.model);
      if (!isCurrentSession(session)) {
        model.dispose();
        return;
      }
      emit("model", model as Model<D>);
    }
    const cleanupError = await cleanup;
    if (!isCurrentSession(session) || message.type === "error") return;
    if (cleanupError !== undefined) showTrainingError(new Error(cleanupError));
    else if (message.stopped) toaster.info("Training stopped");
    else toaster.success("Training successfully completed");
  } catch (error) {
    if (message.type === "error")
      debug("while recovering partial model: %o", error);
    else showTrainingError(error);
  } finally {
    await cleanup;
    clearTimeout(cleanupTimeout);
    closeWorker(session);
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

function closeWorker(session: Session): void {
  if (!isCurrentSession(session)) return;
  if (phase.value.kind === "stopping") clearTimeout(phase.value.timeout);
  session.resolveClosed();
  session.worker.terminate();
  session.closePeerTransport?.();
  phase.value = { kind: "idle" };
}

function stopTraining(): void {
  if (phase.value.kind !== "training") return;
  const { session } = phase.value;
  // Only force termination if the worker cannot acknowledge the stop request.
  const timeout = setTimeout(() => {
    if (!isCurrentSession(session)) return;
    closeWorker(session);
    toaster.info("Training stopped");
  }, 10_000);
  phase.value = { kind: "stopping", session, timeout };
  session.worker.postMessage({ type: "stop" } satisfies ToWorker);
}

onUnmounted(() => {
  if (phase.value.kind !== "idle") closeWorker(phase.value.session);
});
</script>

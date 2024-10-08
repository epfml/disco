<template>
  <div v-show="validationStore.step === 0">
    <div class="flex flex-col gap-8">
      <div v-if="!models.infos.isEmpty()">
        <IconCard title-placement="center">
          <template #title>
            Model Library —
            <span class="italic">Locally Available and Ready to Test</span>
          </template>

          Test any model below against a validation dataset. The models listed
          were downloaded from the remote server. Perhaps you even contributed
          to their training! Note that these models are currently stored within
          your browser's memory.

          <div
            class="grid gris-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-8 mt-8"
          >
            <div
              v-for="[id, infos] in sortedModelsInfos"
              :key="id"
              class="contents"
            >
              <ButtonsCard
                :buttons="
                  List.of(
                    ['test', () => selectModel(id, 'test')],
                    ['predict', () => selectModel(id, 'predict')],
                  )
                "
                class="shadow shadow-disco-cyan"
              >
                <template #title> {{ taskTitle(infos.taskID) }} </template>
                <template #icon>
                  <button
                    @click="removeModel(id)"
                    class="hover:text-red-500 transition duration-200"
                  >
                    <Bin2Icon />
                  </button>
                </template>

                <table class="w-full">
                  <tbody>
                    <tr>
                      <td>Saved date</td>
                      <td>{{ infos.dateSaved }}</td>
                    </tr>
                    <tr>
                      <td>Storage size</td>
                      <td>{{ infos.storageSize }}</td>
                    </tr>
                  </tbody>
                </table>
              </ButtonsCard>
            </div>
          </div>
        </IconCard>
      </div>
      <div v-else>
        <IconCard>
          <template #title> Empty Model Library </template>

          Disco failed to find any model stored locally. Please go to the
          <RouterLink class="underline text-blue-400" to="/list"
            >training page</RouterLink
          >
          or directly download a model below, from the Disco repository.
        </IconCard>
      </div>

      <div>
        <IconCard title-placement="center">
          <template #title>
            <span><DISCO /> Model Repository — <span class="italic">Download and Test</span></span>
            
            
          </template>

          <div
            v-if="tasksStore.status == 'loading'"
            class="my-10 flex flex-col justify-center items-center"
          >
            <VueSpinner size="50" color="#6096BA" />
            <div class="mt-10 flex flex-col justify-center items-center">
              <p class="text-disco-blue">Loading <DISCOllaboratives /></p>
              <p class="text-disco-blue text-xs">This can take a few seconds</p>
            </div>
          </div>
          <div v-else-if="federatedTasks.size > 0">
            Select any model below to download it. For federated tasks only. The
            models listed are not currently stored in your browser's memory, but
            are available and downloadable from the remote Disco server.
            <div
              class="grid gris-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-8 mt-8"
            >
              <div
                v-for="task in federatedTasks.toArray()"
                :key="task.id"
                class="contents"
              >
                <ButtonsCard
                  :buttons="List.of(['download', () => downloadModel(task)])"
                  class="shadow shadow-disco-cyan"
                >
                  <template #title>
                    {{ task.displayInformation.taskTitle }}
                  </template>

                  Download the latest
                  {{ task.displayInformation.taskTitle }} model available on the
                  remote server.
                </ButtonsCard>
              </div>
            </div>
          </div>
          <div v-else>
            A problem occurred while fetching <DISCOllaboratives />
          </div>
        </IconCard>
      </div>
    </div>
  </div>

  <div v-if="selection !== undefined">
    <div v-if="validationStore.step !== 0">
      <TestSteps
        v-if="selection.mode === 'test'"
        :task="selection.task"
        :model="selection.model"
      />
      <PredictSteps
        v-if="selection.mode === 'predict'"
        :task="selection.task"
        :model="selection.model"
      />
    </div>
  </div>

  <TestingButtons class="mt-5" />
</template>

<script lang="ts" setup>
import createDebug from "debug";
import { List } from "immutable";
import { computed, ref, onActivated } from "vue";
import { RouterLink } from "vue-router";
import { VueSpinner } from "vue3-spinners";

import type { Model, Task } from "@epfml/discojs";
import { client as clients, aggregator } from "@epfml/discojs";

import Bin2Icon from "@/assets/svg/Bin2Icon.vue";
import { useToaster } from "@/composables/toaster";
import { CONFIG } from "@/config";
import type { ModelID } from "@/store";
import { useModelsStore } from "@/store";
import { useTasksStore } from "@/store";
import { useValidationStore } from "@/store";

import ButtonsCard from "@/components/containers/ButtonsCard.vue";
import IconCard from "@/components/containers/IconCard.vue";
import TestingButtons from "@/components/progress_bars/TestingButtons.vue";
import DISCO from "@/components/simple/DISCO.vue";
import DISCOllaboratives from "@/components/simple/DISCOllaboratives.vue";

import TestSteps from "./TestSteps.vue";
import PredictSteps from "./PredictSteps.vue";

const debug = createDebug("webapp:Testing");
const validationStore = useValidationStore();
const models = useModelsStore();
const tasksStore = useTasksStore();
const toaster = useToaster();

const selection = ref<{
  mode: "predict" | "test";
  task: Task;
  // same as in validation store but not undef
  model: Model;
}>();

const federatedTasks = computed(() =>
  tasksStore.tasks
    .filter((t) => t.trainingInformation.scheme === "federated")
    .toList(),
);

const sortedModelsInfos = computed(() => {
  const shortDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });

  return models.infos
    .sortBy((infos) => infos.dateSaved)
    .map(({ taskID, dateSaved, storageSize }) => ({
      taskID,
      dateSaved: shortDate.format(dateSaved),
      storageSize: formatByteSize(storageSize),
    }))
    .reverse();
});

function formatByteSize(size: number): string {
  let unit;
  for (unit of ["byte", "kilobyte", "megabyte", "gigabyte"]) {
    if (size < 1024) break;
    size /= 1024;
  }

  return new Intl.NumberFormat(undefined, {
    style: "unit",
    unit,
    maximumFractionDigits: 0,
  }).format(size);
}

onActivated(() => {
  // handle test after training or from library
  // TODO encode model ID inside the URL instead of relying on store
  if (validationStore.modelID !== undefined)
    selectModel(validationStore.modelID, "test");
});

async function downloadModel(task: Task): Promise<void> {
  try {
    toaster.info("Downloading model...");

    const client = new clients.LocalClient(
      CONFIG.serverUrl,
      task,
      aggregator.getAggregator(task),
    );
    const model = await client.getLatestModel();

    await models.add(task.id, model);
  } catch (e) {
    debug("while downloading model: %o", e);
    toaster.error("Something went wrong, please try again later.");
    return;
  }

  toaster.success("Model successfully downloaded!");

  const scrollableDiv = document.getElementById("scrollable-div");
  if (scrollableDiv !== null)
    scrollableDiv.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
}

async function selectModel(
  modelID: ModelID,
  mode: "predict" | "test",
): Promise<void> {
  const model = await models.get(modelID);
  if (model === undefined) throw new Error("model ID not present in store");

  const taskID = models.infos.get(modelID)?.taskID;
  if (taskID === undefined) throw new Error("task ID for model ID not found");
  const task = tasksStore.tasks.get(taskID);
  if (task === undefined) throw new Error("task not found");

  selection.value = { mode, model, task };
  validationStore.mode = mode;
  validationStore.modelID = modelID;
  validationStore.step = 1;
}

async function removeModel(modelID: ModelID): Promise<void> {
  toaster.default("Click here to confirm the model deletion", {
    onClick: () => models.remove(modelID),
    duration: 10000,
  });
}

function taskTitle(taskID: string): string | undefined {
  if (tasksStore.status !== "success") return undefined;

  const titled = tasksStore.tasks.get(taskID);
  if (titled === undefined)
    throw new Error("Task title not found for task id: " + taskID);

  return titled.displayInformation.taskTitle;
}
</script>

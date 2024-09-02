<template>
  <div v-show="validationStore.step === 0">
    <div class="flex flex-col gap-8">
      <div v-if="memoryStore.models.size > 0">
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
              v-for="[id, metadata] in memoryStore.models"
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
                <template #title>
                  {{ taskTitle(metadata.taskID) }}
                </template>

                <div class="grid grid-cols-2 justify-items-between">
                  <p class="contents">
                    <span>Model:</span>
                    <span>
                      {{ metadata.name.slice(0, 20) }}
                      <span
                        v-if="
                          metadata.version !== undefined &&
                          metadata.version !== 0
                        "
                      >
                        ({{ metadata.version }})
                      </span>
                    </span>
                  </p>
                  <p class="contents">
                    <span>Date:</span>
                    <span>{{ metadata.date }} at {{ metadata.hours }}</span>
                  </p>
                  <p class="contents">
                    <span>Size:</span><span>{{ metadata.fileSize }} kB</span>
                  </p>
                  <p class="contents">
                    <span>Type:</span
                    ><span>{{
                      metadata.type === "saved" ? "Saved" : "Cached"
                    }}</span>
                  </p>
                </div>
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
            <DISCO />
            Model Repository — <span class="italic">Download and Test</span>
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
import { EmptyMemory, client as clients, aggregator } from "@epfml/discojs";
import { IndexedDB } from "@epfml/discojs-web";

import { useToaster } from "@/composables/toaster";
import { CONFIG } from "@/config";
import { useMemoryStore } from "@/store/memory";
import { useTasksStore } from "@/store/tasks";
import { useValidationStore } from "@/store/validation";

import ButtonsCard from "@/components/containers/ButtonsCard.vue";
import IconCard from "@/components/containers/IconCard.vue";
import TestingButtons from "@/components/progress_bars/TestingButtons.vue";
import DISCO from "@/components/simple/DISCO.vue";
import DISCOllaboratives from "@/components/simple/DISCOllaboratives.vue";

import TestSteps from "./TestSteps.vue";
import PredictSteps from "./PredictSteps.vue";

const debug = createDebug("webapp:Testing");
const validationStore = useValidationStore();
const memoryStore = useMemoryStore();
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
const memory = computed(() =>
  memoryStore.useIndexedDB ? new IndexedDB() : new EmptyMemory(),
);

onActivated(async () => {
  await memoryStore.initModels();

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

    const source = {
      type: "saved" as const,
      taskID: task.id,
      name: task.trainingInformation.modelID,
      tensorBackend: task.trainingInformation.tensorBackend,
    };
    await memory.value.saveModel(source, model);
    await memoryStore.initModels();
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
  modelID: string,
  mode: "predict" | "test",
): Promise<void> {
  const taskID = memory.value.getModelInfo(modelID)?.taskID;
  if (taskID === undefined) throw new Error("task ID for model ID not found");

  const task = tasksStore.tasks.get(taskID);
  if (task === undefined) throw new Error("task not found");

  if (!(await memory.value.contains(modelID)))
    throw new Error("model ID not present in memory");
  const model = await memory.value.getModel(modelID);

  selection.value = { mode, model, task };
  validationStore.mode = mode;
  validationStore.modelID = modelID;
  validationStore.step = 1;
}

function taskTitle(taskID: string): string | undefined {
  if (tasksStore.status !== "success") return undefined;

  const titled = tasksStore.tasks.get(taskID);
  if (titled === undefined)
    throw new Error("Task title not found for task id: " + taskID);

  return titled.displayInformation.taskTitle;
}
</script>

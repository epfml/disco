<template>
  <article
    aria-label="File Upload Model"
    class="h-full flex flex-col bg-white dark:bg-slate-950 rounded-lg"
    @drop.prevent
    @dragover.prevent
    @dragenter.prevent
  >
    <section>
      <!-- Hide the file input field when already submitted-->
      <div
        v-if="!hideConnectField"
        class="border-dashed rounded-xl border-disco-cyan flex flex-col justify-center items-center min-h-48"
        :class="
          isDragHoverActive ? 'bg-blue-100 opacity-75 border-8' : 'border-2'
        "
        @dragenter="onDragEnter"
        @dragleave="onDragLeave"
        @drop="async (e: DragEvent) => await dragFiles(e)"
      >
        <p class="p-4 text-lg text-disco-blue dark:text-disco-light-blue flex-wrap justify-center">
          <span>Drag and drop the {{ fileType }} or</span>
        </p>
        <label class="mb-6">
          <span
            class="px-4 py-2 min-w-[8rem] text-lg uppercase text-white bg-disco-cyan rounded duration-200 hover:bg-white hover:dark:bg-slate-950 hover:outline hover:outline-disco-cyan hover:outline-2 hover:text-disco-cyan hover:cursor-pointer"
          >
            select {{ fileType }}
          </span>
          <input
            ref="inputFileElement"
            type="file"
            :multiple="multiple"
            :accept="acceptFilter"
            class="hidden"
            @change="async () => await submitFiles()"
          />
        </label>
      </div>
      <!-- Display what has been connected -->
      <div
        v-if="files === undefined"
        class="flex justify-end items-center mt-1"
      >
        <span
          class="hover:cursor-pointer"
          v-tippy="{
            content: 'Data always stays on your device and is never shared.',
          }"
        >
          <i class="fa fa-lock mr-1" />
        </span>
      </div>

      <!-- Display some text if specified -->
      <div
        v-if="$slots.default && files === undefined"
        class="flex justify-center mt-5"
      >
        <p class="text-slate-500 dark:text-slate-300 text-sm">
          <span><slot /></span>
        </p>
      </div>

      <!-- If only one file is connected, display its name, if multiple display the number of files -->
      <div
        v-if="files !== undefined"
        class="pt-4 flex flex-col items-center pb-5"
      >
      <!-- Display a loading indicator if needed -->
      <div v-if="loading" class="mb-8">
        <VueSpinner size="50" color="#6096BA"/>
      </div>
      <!-- Otherwise display the files connected -->
      <div v-else
        class="mb-4 flex justify-center items-center text-center md:text-left sm:text-lg text-disco-blue dark:text-disco-light-cyan"
      >
        <!-- If multiple files, display the number of files -->
        <span v-if="multiple"
        >Number of selected files:
        <span class="pl-1 text-xl">{{ files.size }}</span></span
        >
        <!-- If a single file, display the filename -->
        <span v-else class="pl-1">{{ files.first()?.name ?? "none" }}</span>
        </div>
        <div>
          <CustomButton @click="clearFiles">
            clear {{ fileType }}
          </CustomButton>
        </div>
      </div>
    </section>
  </article>
</template>

<script lang="ts" setup>
import { Set } from "immutable";
import { computed, ref } from "vue";
import { VueSpinner } from 'vue3-spinners';

import CustomButton from "@/components/simple/CustomButton.vue";

const props = withDefaults(
  defineProps<{
    type: "tabular" | "image" | "text";
    multiple?: boolean; // accept one or multiple files
    loading?: boolean; // whether to show the loading spinner
  }>(),
  {
    multiple: false,
    loading: false,
  },
);

const files = defineModel<Set<File>>();

const inputFileElement = ref<HTMLInputElement | null>(null);

const hideConnectField = computed(() => files.value !== undefined);

const fileType = computed(() => {
  const name = (() => {
    // need function wrap vuejs/eslint-plugin-vue#2142
    switch (props.type) {
      case "image":
        return "image";
      case "tabular":
        return "CSV";
      case "text":
        return "text file";
    }
  })();

  return `${name}${props.multiple ? "s" : ""}`;
});
const acceptFilter = computed(() => {
  switch (props.type) {
    case "image":
      return "image/*";
    case "tabular":
      return ".csv";
    case "text":
      return "text/plain";
  }

  // vuejs/eslint-plugin-vue#2142
  props.type satisfies never;
  throw new TypeError("invalid value");
});

// we use an event counter to test whether the user is dragging a file over the field
// because events are triggered multiple times when hovering of children elements (such as button or text)
const dragEventCount = ref(0);
const isDragHoverActive = computed(() => dragEventCount.value > 0);

async function submitFiles() {
  const inputs = inputFileElement.value?.files;
  if (inputs === null) return;

  files.value = Set(inputs);
}
async function dragFiles(e: DragEvent) {
  dragEventCount.value = 0;

  if (e.dataTransfer === null) return;
  e.dataTransfer.dropEffect = "copy";
  const inputs = e.dataTransfer.files;

  files.value = Set(inputs);
}
function clearFiles() {
  files.value = undefined;
}

function onDragEnter() {
  dragEventCount.value++;
}
function onDragLeave() {
  dragEventCount.value--;
}
</script>

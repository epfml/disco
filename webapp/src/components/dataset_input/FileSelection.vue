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
      <div v-if="noUpload" class="flex justify-center items-center mb-4">
        <span
          v-tippy="{
            content:
              'Your files are read locally in your browser, they are never sent to our servers or anyone else\'s. To convince yourself, you can start a local training while turning off your machine\'s Wi-Fi!',
          }"
          class="bg-green-200 text-green-800 dark:text-green-200 dark:bg-green-800 rounded-full hover:cursor-pointer px-2 py-1"
        >
          <i class="fa fa-lock mr-1" />
          <span> Stays on your device </span>
        </span>
      </div>
      <div
        v-if="!hideConnectField"
        :data-testid="`drop-${props.type}-area`"
        class="border-dashed rounded-xl border-disco-cyan flex flex-col justify-center items-center min-h-48"
        :class="
          isDragHoverActive ? 'bg-blue-100 opacity-75 border-8' : 'border-2'
        "
        @dragenter="onDragEnter"
        @dragleave="onDragLeave"
        @drop="(e: DragEvent) => void dragFiles(e)"
      >
        <p
          class="p-4 text-lg text-disco-blue dark:text-white flex-wrap justify-center"
        >
          <span>Drop {{ droppable }} here or</span>
        </p>
        <label class="mb-6" :data-testid="`select-${props.type}-button`">
          <span
            class="px-4 py-2 min-w-32 text-lg capitalize text-white bg-disco-cyan font-disco rounded-full duration-200 hover:bg-transparent dark:hover:bg-transparent hover:outline-solid hover:outline-2 hover:outline-disco-cyan dark:hover:outline-disco-light-cyan hover:text-disco-cyan dark:hover:text-disco-light-cyan"
          >
            <i v-if="noUpload" class="fas fa-file mr-2" />
            <span>select</span>
          </span>
          <input
            ref="inputFileElement"
            type="file"
            :multiple="multiple"
            :accept="acceptFilter"
            class="hidden"
            @change="() => submitFiles()"
            @blur="() => emit('blur')"
          />
        </label>
      </div>

      <!-- Display some text if specified -->
      <div
        v-if="$slots.default && files === undefined"
        class="flex justify-center mt-5"
      >
        <p
          class="text-sm text-font-secondary-light dark:text-font-secondary-dark"
        >
          <span><slot /></span>
        </p>
      </div>

      <!-- If only one file is connected, display its name, if multiple display the number of files -->
      <div
        v-if="files !== undefined"
        class="pt-4 flex flex-col items-center pb-5"
      >
        <div
          class="flex justify-center items-center text-center md:text-left sm:text-lg text-disco-blue dark:text-white"
        >
          <i v-if="noUpload" class="fas fa-folder-open mr-2" />
          <span v-if="multiple">
            Number of selected files:
            <span class="text-xl">{{ files.size }}</span>
          </span>
        </div>
        <div class="flex flex-col py-4">
          <span v-for="(name, i) in fileNamesDisplay" :key="i">{{ name }}</span>
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
import { Range, Set } from "immutable";
import { computed, ref } from "vue";

import CustomButton from "@/components/simple/CustomButton.vue";
import { useToaster } from "@/composables/toaster";

import { dropped } from "./files";
import type { FileType } from "./files";

const toaster = useToaster();

const props = withDefaults(
  defineProps<{
    type: FileType;
    multiple?: boolean; // accept one or multiple files
    noUpload?: boolean;
  }>(),
  {
    multiple: false,
    noUpload: false,
  },
);

const emit = defineEmits<{
  // forward some more event to mimick more <file>
  // needed to better integrate with vee
  // https://vee-validate.logaretm.com/v4/api/field/#rendering-complex-fields-with-scoped-slots
  blur: [];
}>();

const files = defineModel<Set<File> | undefined>();
const hideConnectField = computed(() => files.value !== undefined);
const inputFileElement = ref<HTMLInputElement | null>(null);

const fileType = computed(() => {
  const name = (() => {
    switch (props.type) {
      case "image":
        return "image";
      case "json":
        return "JSON file";
      case "tabular":
        return "CSV";
      case "text":
        return "text file";
    }
  })();

  return `${name}${props.multiple ? "s" : ""}`;
});

const droppable = computed(() =>
  props.multiple ? `${fileType.value} or a folder` : fileType.value,
);

const acceptFilter = computed(() => {
  switch (props.type) {
    case "image":
      return "image/*";
    case "json":
      return "application/json";
    case "tabular":
      return ".csv";
    case "text":
      return "text/plain";
  }
});

const fileNamesDisplay = computed(() => {
  if (!files.value) return "";
  const arr = files.value.map((f) => f.name);
  if (arr.size < 5) {
    return arr;
  } else {
    return [...arr.slice(0, 3), "...", arr.last()];
  }
});

// we use an event counter to test whether the user is dragging a file over the field
// because events are triggered multiple times when hovering of children elements (such as button or text)
const dragEventCount = ref(0);
const isDragHoverActive = computed(() => dragEventCount.value > 0);

function setFiles(fl: FileList): void {
  const r = Range(0, fl.length)
    .map((_, i) => fl.item(i))
    .filter((f) => f !== null)
    .toSet();

  files.value = r;
}

function submitFiles() {
  const inputs = inputFileElement.value?.files;
  if (inputs === undefined || inputs === null) return;

  setFiles(inputs);
}

async function dragFiles(e: DragEvent) {
  dragEventCount.value = 0;

  if (e.dataTransfer === null) return;
  e.dataTransfer.dropEffect = "copy";

  const { files: selected, ignored } = await dropped(
    e.dataTransfer,
    props.type,
  );

  if (selected.length === 0) {
    toaster.error(`Didn't find any ${fileType.value} in what you dropped`);
    return;
  }
  if (!props.multiple && selected.length > 1) {
    toaster.error(`Drop a single ${fileType.value}`);
    return;
  }
  if (ignored > 0)
    toaster.info(`Ignored ${ignored} file(s) that aren't ${fileType.value}`);

  files.value = Set(selected);
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

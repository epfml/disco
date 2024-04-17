<template>
  <!-- Upload File Card-->
  <div>
    <article
      aria-label="File Upload Model"
      class="h-full flex flex-col md:p-8 bg-white rounded-lg"
      @drop.prevent
      @dragover.prevent
      @dragenter.prevent
    >
      <!-- scroll area -->
      <section class="overflow-auto">
        <header
          class="border-dashed rounded-xl border-2 border-disco-cyan flex flex-col justify-center items-center"
          @drop="dragFiles"
        >
          <p class="p-4 text-lg text-disco-blue flex-wrap justify-center">
            <span>Drag and drop your</span>&nbsp;<span
              >file{{ isMultiple ? "s" : "" }} or</span
            >
          </p>
          <label class="mb-6">
            <span
              class="px-4 py-2 min-w-[8rem] text-lg uppercase text-white bg-disco-cyan rounded duration-200 hover:bg-white hover:outline hover:outline-disco-cyan hover:outline-2 hover:text-disco-cyan hover:cursor-pointer"
            >
              select
              {{ isDirectory ? "folder" : "file" + (isMultiple ? "s" : "") }}
            </span>
            <input
              v-if="isDirectory"
              ref="uploadDirectory"
              type="file"
              multiple
              webkitdirectory
              directory
              class="hidden"
              @change="submitDirectory"
            />
            <input
              v-else
              ref="uploadFile"
              type="file"
              :multiple="isMultiple"
              :accept="acceptFiles.join(',')"
              class="hidden"
              @change="submitFiles"
            />
          </label>
        </header>

        <div v-if="infoText" class="mt-4 md:mt-8 flex justify-centerz">
          <p class="text-slate-500 text-sm">
            Note: <span><slot name="text" /></span>
          </p>
        </div>

        <!-- If preview of the selected file, display of small preview of selected files -->

        <!-- TODO: There is a recursion issue with preview-gallery -->
        <!-- <div v-if="preview">
          <preview-gallery :fileUploadManager="fileUploadManager" />
          <div v-else>
            ...
        </div> -->

        <!-- If no preview of the selected file, display the nbr. of uploaded files -->
        <div class="pt-8 flex flex-col items-center pb-2">
          <div
            v-if="selectedFiles?.length"
            class="mb-4 flex justify-center items-center text-center md:text-left sm:text-lg text-disco-blue"
          >
            <span v-if="isMultiple"
              >Number of selected files:
              <span class="pl-1 text-xl">{{
                selectedFiles?.length ?? 0
              }}</span></span
            >
            <span v-else
              >Selected file:
              <span class="pl-1">{{
                selectedFiles?.[0]?.name ?? "none"
              }}</span></span
            >
          </div>
          <CustomButton @click="clearFiles">
            clear file{{ isMultiple ? "s" : "" }}
          </CustomButton>
        </div>
      </section>
    </article>
  </div>
</template>

<script lang="ts" setup>
import { Set } from "immutable";
import { ref, withDefaults } from "vue";

import CustomButton from "@/components/simple/CustomButton.vue";

const emit = defineEmits<{
  files: [files: Set<File> | undefined];
}>();

withDefaults(
  defineProps<{
    isDirectory?: boolean;
    isMultiple?: boolean; // TODO how much logical crossing w/ isDirectory
    acceptFiles?: string[];
    infoText?: boolean;
  }>(),
  {
    isDirectory: false,
    isMultiple: true,
    acceptFiles: () => ["*"],
    infoText: false,
  },
);

const selectedFiles = ref<File[]>();

const uploadFile = ref<HTMLInputElement>();
const uploadDirectory = ref<HTMLInputElement>();

function submitFiles(): void {
  if (uploadFile.value === undefined) return;
  const files = uploadFile.value.files;
  if (files === null) return;

  selectedFiles.value = Array.from(files);
  emit("files", Set(files));
}
function submitDirectory(): void {
  if (uploadDirectory.value === undefined) return;
  const files = uploadDirectory.value.files;
  if (files === null) return;

  selectedFiles.value = Array.from(files);
  emit("files", Set(files));
}
function dragFiles(e: DragEvent): void {
  if (e.dataTransfer === null) return;
  const files = e.dataTransfer.files;

  e.dataTransfer.dropEffect = "copy";

  selectedFiles.value = Array.from(files);
  emit("files", Set(files));
}

function clearFiles(): void {
  selectedFiles.value = undefined;
  emit("files", undefined);
}
</script>

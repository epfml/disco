<template>
  <article
    aria-label="File Upload Model"
    class="h-full flex flex-col bg-white rounded-lg"
    @drop.prevent
    @dragover.prevent
    @dragenter.prevent
  >
    <section>
      <!-- Hide the file input field when already submitted-->
      <div
        v-if="!hideConnectField"
        class="
          border-dashed rounded-xl border-disco-cyan
          flex flex-col justify-center items-center
          min-h-48
        "
        :class="isDragHoverActive ? 'bg-blue-100 opacity-75 border-8' : 'border-2'"
        @dragenter="onDragEnter" 
        @dragleave="onDragLeave"
        @drop="async (e: DragEvent) => await dragFiles(e)"
      >
          <p class="p-4 text-lg text-disco-blue flex-wrap justify-center">
            <span>Drag and drop the</span>&nbsp;<span> {{ fileType }}{{ isMultiple ? 's' : '' }} or</span>
          </p>
          <label class="mb-6">
            <span
              class="
                  px-4 py-2 min-w-[8rem]
                  text-lg uppercase text-white
                  bg-disco-cyan
                  rounded duration-200
                  hover:bg-white hover:outline hover:outline-disco-cyan hover:outline-2 hover:text-disco-cyan
                  hover:cursor-pointer
                "
            >
              select {{ fileType + (isMultiple ? 's' : '') }}
            </span>
            <input
              ref="inputFileElement"
              type="file"
              :multiple="isMultiple"
              :accept="acceptFiles.join(',')"
              class="hidden"
              @change="async () => await submitFiles()"
            >
          </label>
      </div>
      <!-- Display what has been connected -->
      <div 
        v-if="selectedFiles === undefined"
        class="flex justify-end items-center mt-1"
      >
        <span 
        class="hover:cursor-pointer"
        v-tippy="{ content: 'Data always stays on your device and is never shared.' }"
        >
          <i class="fa fa-lock mr-1" />
        </span>
      </div>

      <!-- Display some text if specified -->
      <div
        v-if="infoText && selectedFiles === undefined"
        class="flex justify-center mt-5"
      >
        <p class="text-slate-500 text-sm">
          <span><slot name="text" /></span>
        </p>
      </div>

      <!-- If only one file is connected, display its name, if multiple display the number of files -->
      <div v-if="selectedFiles?.length" class="pt-4 flex flex-col items-center pb-5">
        <div
          class="mb-4 flex justify-center items-center text-center md:text-left sm:text-lg text-disco-blue">
          <span v-if="isMultiple">Number of selected files: <span class="pl-1 text-xl">{{ selectedFiles?.length ?? 0 }}</span></span>
          <span v-else class="pl-1">{{ selectedFiles?.item(0)?.name ?? 'none' }}</span>
        </div>
        <div>
          <CustomButton @click="clearFiles">
            clear file{{ isMultiple ? 's' : '' }}
          </CustomButton>
        </div>
      </div>
    </section>
  </article>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import * as d3 from 'd3'

import CustomButton from '@/components/simple/CustomButton.vue'
import type { Task } from '@epfml/discojs'
import { data } from '@epfml/discojs'
import { useToaster } from '@/composables/toaster'

const toaster = useToaster()

type CSV = { filename: string, label: string }[] | undefined

interface Emits {
  (e: 'csv', csvRows: CSV): void
}

interface Props {
  task: Task
  datasetBuilder: data.DatasetBuilder<File>
  csvRows: CSV,
  acceptFiles?: string[], // file formats accepted
  isMultiple?: boolean, // is this input field accepting one or multiple files
  infoText?: boolean,
  label?: string, // for connecting images by category, for which category this input field is
  expectCsvMapping?: boolean // for connecting images via a CSV mapping images to labels
}
const props = withDefaults(defineProps<Props>(), {
  isMultiple: true,
  acceptFiles: () => ['*'],
  infoText: false,
  label: undefined,
  expectCsvMapping: false
})

const emit = defineEmits<Emits>()
const selectedFiles = ref<FileList>()
const inputFileElement = ref<HTMLInputElement>()

// true when files are already connected
const hideConnectField = ref(false)

// we use an event counter to test whether the user is dragging a file over the field
// because events are triggered multiple times when hovering of children elements (such as button or text) 
const dragEventCount = ref(0)
const isDragHoverActive = computed(() => dragEventCount.value > 0)

const fileType = computed(() => {
  if (props.expectCsvMapping === true || props.task.trainingInformation.dataType === 'tabular') {
    return 'CSV'
  }
  return props.task.trainingInformation.dataType === 'image' ? 'image' : 'file'
})
const requireLabels = computed(
  () => props.task.trainingInformation.LABEL_LIST !== undefined
)

async function submitFiles() {
  if (inputFileElement.value === undefined) return
  const files = inputFileElement.value.files
  if (files === null) return
  await addFiles(files)
}

async function dragFiles(e: DragEvent) {
  dragEventCount.value = 0
  if (e.dataTransfer === null) return
  e.dataTransfer.dropEffect = 'copy'
  const files = e.dataTransfer.files
  await addFiles(files)
}

function onDragEnter() {
  dragEventCount.value++
}

function onDragLeave() {
  dragEventCount.value--
}


async function addFiles(files: FileList) {
  if (props.expectCsvMapping) {
    await readCsvImageMapping(files)
    return
  }
  try {
    const filesArray = Array.from(files)
    // If the task is an image task with labels specified
    if (props.task.trainingInformation.dataType === 'image' && requireLabels.value) {
      if (props.label !== undefined) {
        props.datasetBuilder.addFiles(filesArray, props.label)
      } else {
        if (props.csvRows === undefined) {
          throw new Error('adding files but no CSV rows defined')
        }
        // Match the selected files with the csv file names and label
        // Create a map from filename to file to speed up the search 
        const filenameToFile = new Map(filesArray.map((file) => {
          const filename = file.name.split('.').slice(0, -1).join('.');
          return [filename, file] as const;
        }))
        props.csvRows.forEach(row => {
          const imageFile = filenameToFile.get(row.filename)
          if (imageFile === undefined) {
            toaster.error("Some images listed in the CSV file are missing, make sure the CSV filenames don't include file extensions.")
            throw new Error("Image not found in the CSV file")
          }
          props.datasetBuilder.addFiles([imageFile], row.label)
        })
      }
      // Otherwise just add the files directly
    } else {
      props.datasetBuilder.addFiles(filesArray)
    }
    selectedFiles.value = files
    hideConnectField.value = true
  } catch {
    clearFiles()
  }
}

async function readCsvImageMapping(files: FileList) {
  await files[0].text().then(file => {
    const csvRows = d3.csvParse(file) as CSV
    if (csvRows === undefined) {
      toaster.error("Unable to read the CSV file.")
      throw new Error("UndefinedCSV file")
    } else if (csvRows[0].filename == undefined || csvRows[0].label == undefined) {
      toaster.error("The CSV file should have a header with these exact 2 column names: filename, label.")
      throw new Error("Invalid CSV header")
    }
    selectedFiles.value = files
    emit('csv', csvRows)
    hideConnectField.value = true
  }).catch(() => clearFiles())
}

function clearFiles() {
  props.datasetBuilder.clearFiles(props.label)
  hideConnectField.value = false
  selectedFiles.value = undefined
  if (props.expectCsvMapping) {
    emit('csv', undefined)
  }
}

</script>
<template>
  <!-- Upload File Card-->
  <div>
    <article
      aria-label="File Upload Model"
      class="
        h-full
        flex flex-col
        bg-white
        rounded-lg
      "
      @drop.prevent
      @dragover.prevent
      @dragenter.prevent
    >
      <!-- scroll area -->
      <section>
        <header
           v-if="!hideConnectField"
          class="
            border-dashed rounded-xl border-2 border-disco-cyan
            flex flex-col
            justify-center
            items-center
          "
          @drop="async (e: DragEvent) => await dragFiles(e)"
        >
          <div class="flex flex-col
            justify-center
            items-center">
            <p
              class="
                p-4
                text-lg
                text-disco-blue
                flex-wrap
                justify-center
              "
            >
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
                select {{ isDirectory ? 'folder' : (fileType + (isMultiple ? 's' : ''))}}
              </span>
              <input
                v-if="isDirectory"
                ref="uploadDirectory"
                type="file"
                multiple
                webkitdirectory
                directory
                class="hidden"
                @change="async () => await submitDirectory()"
              >
              <input
                v-else
                ref="uploadFile"
                type="file"
                :multiple="isMultiple"
                :accept="acceptFiles.join(',')"
                class="hidden"
                @change="async () => await submitFiles()"
              >
            </label>
          </div>
        </header>

        <div
          v-if="infoText && selectedFiles === undefined"
          class="flex justify-center mt-5"
        >
          <p class="text-slate-500 text-sm">
            <span><slot name="text" /></span>
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
  </div>
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
  isDirectory?: boolean, // is this input field accepts a directory
  acceptFiles?: string[], // file formated accepted
  isMultiple?: boolean, // is this input field accepting one or multiple files
  infoText?: boolean,
  label?: string, // for connecting images by category, for which category this input field is
  expectCsvMapping?: boolean // for connecting images via a CSV mapping images to labels
}
const props = withDefaults(defineProps<Props>(), {
  isDirectory: false,
  isMultiple: true,
  acceptFiles: () => ['*'],
  infoText: false,
  label: undefined,
  expectCsvMapping:false
})

const emit = defineEmits<Emits>()
const selectedFiles = ref<FileList>()

const uploadFile = ref<HTMLInputElement>()
const uploadDirectory = ref<HTMLInputElement>()

const hideConnectField = ref(false)

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
  if (uploadFile.value === undefined) return
  const files = uploadFile.value.files
  if (files === null) return
  await addFiles(files)
}

async function submitDirectory() {
  if (uploadDirectory.value === undefined) return
  const files = uploadDirectory.value.files
  if (files === null) return
  await addFiles(files)
}

async function dragFiles(e: DragEvent) {
  if (e.dataTransfer === null) return
  e.dataTransfer.dropEffect = 'copy'
  const files = e.dataTransfer.files
  await addFiles(files)
}

async function addFiles(files: FileList) {
  if (props.expectCsvMapping) {
    await readCsvImageMapping(files)
    return
  }
  try{
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

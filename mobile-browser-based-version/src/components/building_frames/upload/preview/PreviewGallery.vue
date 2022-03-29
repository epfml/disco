<template>
  <div class="pt-4">
    <h1 class="pt-8 pb-3 font-semibold sm:text-lg dark:text-lightflex">
      Files Selected
    </h1>
    <ul class="flex flex-1 flex-wrap -m-1">
      <!-- No file to dislay -->
      <empty-data v-if="fileUploadManager.numberOfFiles() == 0" />
      <!-- No file to dislay -->
      <li
        v-for="(file, objectURL) in fileUploadManager.getFilesList()"
        v-else
        :key="objectURL"
        class="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24"
      >
        <image-data
          v-if="file.isImage"
          :file-upload-manager="fileUploadManager"
          :object-u-r-l="objectURL"
        />

        <file-data
          v-else
          :file-upload-manager="fileUploadManager"
          :object-u-r-l="objectURL"
          :file="file"
        />
      </li>
    </ul>
  </div>
</template>

<script>
import EmptyData from './data_types/EmptyData.vue'
import FileData from './data_types/FileData.vue'
import ImageData from './data_types/ImageData.vue'

export default {
  name: 'PreviewGallery',
  components: {
    EmptyData,
    FileData,
    ImageData
  },
  props: {
    fileUploadManager: {
      type: Object,
      default: undefined
    }
  }
}
</script>

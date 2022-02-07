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
        v-else
        v-for="(file, objectURL) in fileUploadManager.getFilesList()"
        :key="objectURL"
        class="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24"
      >
        <image-data
          v-if="file.isImage"
          :fileUploadManager="fileUploadManager"
          :objectURL="objectURL"
        />

        <file-data
          v-else
          :fileUploadManager="fileUploadManager"
          :objectURL="objectURL"
          :file="file"
        />
      </li>
    </ul>
  </div>
</template>

<script>
import EmptyData from './data_types/EmptyData.vue';
import FileData from './data_types/FileData.vue';
import ImageData from './data_types/ImageData.vue';

export default {
  name: 'preview-gallery',
  components: {
    EmptyData,
    FileData,
    ImageData,
  },
  props: {
    fileUploadManager: Object,
  },
};
</script>

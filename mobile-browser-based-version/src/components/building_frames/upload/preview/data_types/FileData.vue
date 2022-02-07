<!-- Upload File Data Template -->
<template :id="fileTemplName">
  <element-data
    :fileUploadManager="fileUploadManager"
    :objectURL="objectURL"
    :header="file.name"
    :body="fileSize"
    headerClass="group-hover:text-primary dark:group-hover:text-primary z-10"
    articleClass="bg-primary-100 dark:bg-dark focus-within:cursor-pointer"
    textClass="text-gray-800 dark:text-gray-50"
    hoverClass="hover:bg-white dark:hover:bg-gray-500"
  />
</template>

<script>
import { FileUploadManager } from "../../../../../helpers/data_validation/file_upload_manager";
import ElementData from "./ElementData.vue";

export default {
  name: "file-data",
  components: {
    ElementData,
  },
  props: {
    fileUploadManager: FileUploadManager,
    objectURL: String,
    file: Object,
  },
  computed: {
    fileSize() {
      return this.file.size > 1024
        ? this.file.size > 1048576
          ? Math.round(this.file.size / 1048576) + "mb"
          : Math.round(this.file.size / 1024) + "kb"
        : this.file.size + "b";
    },
  },
};
</script>

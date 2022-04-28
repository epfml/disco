<!-- Upload Image Data Template-->
<template :id="imageTemplName">
  <element-data
    :file-upload-manager="fileUploadManager"
    :object-u-r-l="objectURL"
    article-class="bg-gray-100 cursor-pointer text-transparent"
    hover-class="hover:bg-gray-300"
  >
    <img
      :src="objectURL"
      :alt="file.name"
      class="img-preview w-full h-full sticky object-cover rounded-md bg-fixed"
    >
  </element-data>
</template>
<script>
import { FileUploadManager } from '../../../../../logic/data_validation/file_upload_manager'
import ElementData from './ElementData.vue'

export default {
  name: 'ImageData',
  components: {
    ElementData
  },
  props: {
    fileUploadManager: FileUploadManager,
    objectURL: {
      type: String,
      default: ''
    }
  }
}
</script>

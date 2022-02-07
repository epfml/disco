<!-- Upload Image Data Template-->
<template v-bind:id="imageTemplName">
  <element-data
    :fileUploadManager="fileUploadManager"
    :objectURL="objectURL"
    articleClass="bg-gray-100 cursor-pointer text-transparent"
    hoverClass="hover:bg-gray-300"
  >
    <img
      :src="objectURL"
      :alt="file.name"
      class="img-preview w-full h-full sticky object-cover rounded-md bg-fixed"
    />
  </element-data>
</template>
<script>
import { FileUploadManager } from '../../../../../helpers/data_validation/file_upload_manager';
import ElementData from './ElementData.vue';

export default {
  name: 'image-data',
  components: {
    ElementData,
  },
  props: {
    fileUploadManager: FileUploadManager,
    objectURL: String,
  },
};
</script>

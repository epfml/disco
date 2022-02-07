<template>
  <!-- Upload File Card-->
  <div class="relative">
    <article
      aria-label="File Upload Model"
      class="
        relative
        h-full
        flex flex-col
        p-4
        bg-white
        rounded-lg
        dark:bg-darker
      "
      @drop="dropHandler"
      @dragover="dragOverHandler"
      @dragleave="dragLeaveHandler"
      @dragenter="dragEnterHandler"
    >
      <span class="text-xl font-semibold"> {{ displayLabel }} </span>
      <!-- scroll area -->
      <section class="overflow-auto p-8 w-full h-full flex flex-col">
        <header
          class="
            border-dashed border-2 border-gray-500
            dark:border-primary
            flex flex-col
            justify-center
            items-center
          "
        >
          <p
            class="
              mb-3
              p-4
              text-lg
              font-semibold
              dark:text-lightflex
              flex-wrap
              justify-center
            "
          >
            <span>Drag and drop your</span>&nbsp;<span>files anywhere or</span>
          </p>
          <input :id="hiddenInputName" type="file" multiple class="hidden" />
          <div class="p-4">
            <button
              :id="uploadButtonName"
              class="
                mt-2
                p-2
                rounded-sm
                text-white
                transition-colors
                duration-200
                bg-primary
                hover:text-primary hover:bg-primary-100
                dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark
                focus:outline-none focus:bg-primary-100
                dark:focus:bg-primary-dark
                focus:ring-primary-darker
              "
            >
              Select files
            </button>
          </div>
        </header>

        <!-- If preview of the selected file, display of small preview of selected files -->
        <div v-if="preview">
          <preview-gallery :fileUploadManager="fileUploadManager" />
        </div>

        <!-- If no preview of the selected file, display the nbr. of uploaded files -->
        <div v-else>
          <div class="pt-4">
            <h1 class="pt-8 pb-3 font-semibold sm:text-lg dark:text-lightflex">
              Number of selected files:
              {{ this.nbrUploadedFiles }}
            </h1>
            <button
              @click="clearFiles"
              class="
                mt-2
                p-2
                rounded-sm
                text-white
                transition-colors
                duration-200
                bg-primary
                hover:text-primary hover:bg-primary-100
                dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark
                focus:outline-none focus:bg-primary-100
                dark:focus:bg-primary-dark
                focus:ring-primary-darker
              "
            >
              Clear files
            </button>
          </div>
        </div>
      </section>
    </article>
  </div>
</template>

<script>
import { FileUploadManager } from "../../../helpers/data_validation/file_upload_manager";
import PreviewGallery from "./preview/PreviewGallery.vue";
import _ from "lodash";

const hasFiles = ({ dataTransfer: { types = [] } }) =>
  types.indexOf("Files") > -1;
export default {
  name: "SingleUploadFrame",
  props: {
    id: String,
    task: Object,
    // The file upload manager associated to the task
    fileUploadManager: FileUploadManager,
    // Preview is used to know if we have to show a snippet of the uploaded files or not
    preview: Boolean,
    // The label associated to the task
    label: String,
  },
  components: {
    PreviewGallery,
  },
  data() {
    return {
      counter: 0,
      nbrUploadedFiles: 0,
      addedFilesUrl: [],
      displayLabel: this.label ? `Label: ${this.label}` : "",
    };
  },
  computed: {
    hiddenInputName() {
      return this.formatName("hidden-input");
    },
    uploadButtonName() {
      return this.formatName("uploadButton");
    },
  },
  methods: {
    formatName(prefix) {
      return `${prefix}_${this.id}_${this.label}`;
    },
    addFile(file) {
      const objectURL = URL.createObjectURL(file);
      let label_name = this.label;
      if (this.label == "Images") {
        label_name = file.name.replace(/\.[^/.]+$/, "");
      }
      // add file to file manager
      this.fileUploadManager.addFile(objectURL, file, label_name);
      this.nbrUploadedFiles += 1;
      // We keep track of ulrs in order to be able to clear them if the user requests it
      this.addedFilesUrl = _.concat(this.addedFilesUrl, objectURL);
    },
    clearFiles() {
      _.forEach(this.addedFilesUrl, (objectURL) =>
        this.fileUploadManager.deleteFile(objectURL)
      );
      this.addedFilesUrl = [];
      this.nbrUploadedFiles = 0;
      this.counter = 0;
    },
    // use to drag dragenter and dragleave events.
    // this is to know if the outermost parent is dragged over
    // without issues due to drag events on its children
    // reset counter and append file to gallery when file is dropped
    dropHandler(ev) {
      ev.preventDefault();
      for (const file of ev.dataTransfer.files) {
        this.addFile(file);
        this.counter = 0;
      }
    },
    // only react to actual files being dragged
    dragEnterHandler(e) {
      e.preventDefault();
      if (!hasFiles(e)) {
        return;
      }
      ++this.counter;
    },
    dragLeaveHandler(e) {
      1 > --this.counter;
    },
    dragOverHandler(e) {
      if (hasFiles(e)) {
        e.preventDefault();
      }
    },
  },

  mounted() {
    // click the hidden input of type file if the visible button is clicked
    // and capture the selected files
    const hidden = document.getElementById(this.hiddenInputName);
    const uploadButton = document.getElementById(this.uploadButtonName);
    uploadButton.onclick = () => hidden.click();
    hidden.onchange = (e) => {
      for (const file of e.target.files) {
        this.addFile(file);
      }
    };
  },
};
</script>

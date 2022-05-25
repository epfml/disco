/* eslint-disable no-unused-expressions */
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
      @drop.prevent
      @dragover.prevent
      @dragenter.prevent
    >
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
          @drop="dragFiles"
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
            <span>Drag and drop your</span>&nbsp;<span>files or</span>
          </p>
          <label>
            <div class="p-4">
              <span
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
              </span>
            </div>
            <input
              type="file"
              multiple
              class="hidden"
              @change="submitFiles"
            >
          </label>
        </header>

        <!-- If preview of the selected file, display of small preview of selected files -->

        <!-- TODO: There is a recursion issue with preview-gallery -->
        <!-- <div v-if="preview">
          <preview-gallery :fileUploadManager="fileUploadManager" />
          <div v-else>
            ...
        </div> -->

        <!-- If no preview of the selected file, display the nbr. of uploaded files -->
        <div>
          <div class="pt-4">
            <h1 class="pt-8 pb-3 font-semibold sm:text-lg dark:text-lightflex">
              Number of selected files:
              {{ nbrSelectedFiles }}
            </h1>
            <button
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
              @click="clearFiles"
            >
              Clear files
            </button>
          </div>
        </div>
      </section>
    </article>
  </div>
</template>

<script lang="ts">
export default {
  name: 'FileSelection',
  components: {
    // PreviewGallery
  },
  props: {
    preview: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      nbrSelectedFiles: 0
    }
  },
  methods: {
    clearFiles () {
      this.$emit('clear')
      this.nbrSelectedFiles = 0
    },
    submitFiles (e) {
      this.$emit('input', e.target.files)
      this.nbrSelectedFiles += e.target.files.length
    },
    dragFiles (e) {
      e.dataTransfer.dropEffect = 'copy'
      this.$emit('input', e.dataTransfer.files)
      this.nbrSelectedFiles += e.dataTransfer.files.length
    }
  }
}
</script>

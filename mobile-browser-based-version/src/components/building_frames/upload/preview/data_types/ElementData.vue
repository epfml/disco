<template>
  <article
    tabindex="0"
    :class="`group w-full h-full rounded-md focus:outline-none focus:shadow-outline relative shadow-sm ${articleClass}`"
  >
    <!-- Slot can hold additional information -->
    <slot />
    <!-- Main card file display -->
    <section
      class="
        flex flex-col
        rounded-md
        text-xs
        break-words
        w-full
        h-full
        z-10
        absolute
        top-0
        p-2
      "
    >
      <h1 :class="`flex-1 ${textClass} ${headerClass}`">
        {{ header }}
      </h1>
      <div class="flex">
        <span :class="`p-1 ${textClass}`">
          <i>
            <file />
          </i>
        </span>
        <p :class="`p-1 text-xs ${textClass}`">
          {{ body }}
        </p>
        <button
          :class="`ml-auto focus:outline-none p-1 rounded-md ${textClass} ${hoverClass}`"
          @click="() => fileUploadManager.deleteFile(objectURL)"
        >
          <bin />
        </button>
      </div>
    </section>
  </article>
</template>

<script>
import { FileUploadManager } from '../../../../../logic/data_validation/file_upload_manager'
import Bin from '../../../../../assets/svg/Bin.vue'
import File from '../../../../../assets/svg/File.vue'

export default {
  name: 'ElementData',
  components: {
    Bin,
    File
  },
  props: {
    fileUploadManager: FileUploadManager,
    objectURL: String,
    header: { default: '', type: String },
    body: { default: '', type: String },
    articleClass: { default: '', type: String },
    headerClass: { default: '', type: String },
    textClass: { default: '', type: String },
    hoverClass: { default: '', type: String }
  }
}
</script>

<template>
  <div
    class="base-image-input mx-auto"
    :style="{ 'background-image': `url(${ImageStore.image})` }"
    @click="chooseImage"
  >
    <span
      v-if="!ImageStore.image"
      class="placeholder"
    >
      Choose an Image
    </span>
    <input
      class="file-input"
      ref="fileInput"
      type="file"
      @input="onSelectFile"
    >
  </div>
</template>


<script>
import ImageStore from '../store/imageStore'

export default {
  data () {
    return {
      imageData: null,
      ImageStore: ImageStore.data
    }
  },
  methods: {
    chooseImage () {
        this.$refs.fileInput.click()
    },
    onSelectFile () {
        const input = this.$refs.fileInput
        const files = input.files
        if (files && files[0]) {
            const reader = new FileReader
            reader.onload = e => {
                this.ImageStore.image = e.target.result
            }
            reader.readAsDataURL(files[0])
            this.$emit('input', files[0])
        }
    }
  }
}
</script>

<style scoped>
.base-image-input {
  display: block;
  width: 200px;
  height: 200px;
  cursor: pointer;
  background-size: cover;
  background-position: center center;
}
.placeholder {
  background: #F0F0F0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #333;
  font-size: 18px;
  font-family: Helvetica;
}
.placeholder:hover {
  background: #E0E0E0;
}
.file-input {
  display: none;
}
</style>
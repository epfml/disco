<template>
  <!-- Predictions Results Example Card -->
  <a id="limitations-target">
    <icon-card
      header="Predictions Results"
      :description="dataExampleText"
    >
      <template #icon><file-earmark-ruled-vue /></template>
      <!-- Data Point Example -->
      <template #extra>
        <div :id="imageId" />

        <div class="relative p-4 overflow-x-hidden">
          <span
            v-for="value in classes"
            :key="value"
            class="text-sm text-gray-500 dark:text-light"
          >
            {{ value.className }} label with probability of
            {{ (value.probability * 100).toFixed(3) }}% <br>
          </span>
        </div>
      </template>
    </icon-card>
  </a>
</template>

<script>
import FileEarmarkRuledVue from '../../assets/svg/FileEarmarkRuled.vue'

export default {
  name: 'ImagePredictionResults',
  components: {
    FileEarmarkRuledVue
  },
  props: {
    classes: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      imageid: 'image_'.concat(this.Id)
    }
  }
}
</script>

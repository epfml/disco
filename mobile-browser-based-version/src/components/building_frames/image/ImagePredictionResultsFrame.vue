<template>
  <!-- Predictions Results Example Card -->
  <a id="limitations-target">
    <icon-card header="Predictions Results" :description="dataExampleText">
      <template v-slot:icon><file-earmark-ruled /></template>
      <!-- Data Point Example -->
      <template v-slot:extra>
        <div v-bind:id="imageId"></div>

        <div class="relative p-4 overflow-x-scroll">
          <span
            v-for="value in classes"
            class="text-sm text-gray-500 dark:text-light"
            v-bind:key="value"
          >
            {{ value.className }} label with probability of
            {{ (value.probability * 100).toFixed(3) }}% <br />
          </span>
        </div>
      </template>
    </icon-card>
  </a>
</template>

<script>
import FileEarmarkRuledVue from '../../../assets/svg/FileEarmarkRuled.vue';
export default {
  name: 'image-prediction-results-frame',
  props: {
    Id: String,
    classes: Array,
    imageElement: HTMLImageElement,
  },
  component: {
    FileEarmarkRuledVue,
  },
  data() {
    return {
      imageId: 'image_'.concat(this.Id),
    };
  },
};
</script>

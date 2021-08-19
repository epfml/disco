<template>
  <!-- Predictions Results Example Card -->
  <a id="limitations-target">
    <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
      <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
        <!-- Card header -->
        <div
          class="flex items-center justify-between p-4 border-b dark:border-primary"
        >
          <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
            Predictions Results
          </h4>
          <div class="flex items-center">
            <span aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                class="bi bi-file-earmark-ruled w-7 h-7"
                viewBox="0 0 16 16"
              >
                <path
                  d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5v2zM3 12v-2h2v2H3zm0 1h2v2H4a1 1 0 0 1-1-1v-1zm3 2v-2h7v1a1 1 0 0 1-1 1H6zm7-3H6v-2h7v2z"
                />
              </svg>
            </span>
          </div>
        </div>

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
      </div>
    </div>
  </a>
</template>

<script>
export default {
  name: 'ImagePredictionResultsFrame',
  props: {
    Id: String,
    classes: Array,
    imageElement: HTMLImageElement,
  },
  data() {
    return {
      imageId: 'image_'.concat(this.Id),
    };
  },
};
</script>

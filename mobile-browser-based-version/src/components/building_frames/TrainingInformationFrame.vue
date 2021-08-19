<template>
  <div
    x-transition:enter="transition duration-300 ease-in-out"
    x-transition:enter-start="opacity-0"
    x-transition:enter-end="opacity-100"
    x-ref="trainingBoard"
    x-show="isTraining"
  >
    <!-- Validation Accuracy users chart -->
    <div class="grid grid-cols-2 p-4 space-x-4 lg:gap-2">
      <div class="col-span-1 bg-white rounded-md dark:bg-darker">
        <!-- Card header -->
        <div class="p-4 border-b dark:border-primary">
          <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
            Validation Accuracy of the Model
          </h4>
        </div>
        <p class="p-4">
          <span
            class="text-2xl font-medium text-gray-500 dark:text-light"
            v-bind:id="trainingInformant.getValValidationAccuracyID()"
            >0</span
          >
          <span class="text-sm font-medium text-gray-500 dark:text-primary"
            >% of validation accuracy</span
          >
        </p>
        <!-- Chart -->
        <div class="relative p-4">
          <canvas
            v-bind:id="trainingInformant.getChartValidationAccuracyID()"
          ></canvas>
        </div>
      </div>

      <div class="col-span-1 bg-white rounded-md dark:bg-darker">
        <!-- Card header -->
        <div class="p-4 border-b dark:border-primary">
          <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
            Training Accuracy of the Model
          </h4>
        </div>
        <p class="p-4">
          <span
            class="text-2xl font-medium text-gray-500 dark:text-light"
            v-bind:id="trainingInformant.getValTrainingAccuracyID()"
            >0</span
          >
          <span class="text-sm font-medium text-gray-500 dark:text-primary"
            >% of training accuracy</span
          >
        </p>
        <!-- Chart -->
        <div class="relative p-4">
          <canvas
            v-bind:id="trainingInformant.getChartTrainingAccuracyID()"
          ></canvas>
        </div>
      </div>
    </div>
  </div>

  <!-- Communication Console -->
  <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
    <!-- Card header -->
    <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
      <div
        class="flex items-center justify-between p-4 border-b dark:border-primary"
      >
        <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
          Peer Training Console
        </h4>
        <div class="flex items-center">
          <span aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              class="bi bi-bezier2 w-7 h-7"
              viewBox="0 0 16 16"
            >
              <path
                fill-rule="evenodd"
                d="M8.646 5.646a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L10.293 8 8.646 6.354a.5.5 0 0 1 0-.708zm-1.292 0a.5.5 0 0 0-.708 0l-2 2a.5.5 0 0 0 0 .708l2 2a.5.5 0 0 0 .708-.708L5.707 8l1.647-1.646a.5.5 0 0 0 0-.708z"
              />
              <path
                d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z"
              />
              <path
                d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z"
              />
            </svg>
          </span>
        </div>
      </div>

      <div id="mapHeader">
        <ul class="grid grid-cols-1 p-4">
          <li
            class="border-gray-400"
            v-for="(message, index) in trainingInformant.messages"
            :key="index"
          >
            <div class="relative overflow-x-scroll">
              <span
                style="white-space: pre-line"
                class="text-sm text-gray-500 dark:text-light"
                >{{ message }}</span
              >
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Distributed Training Information -->
  <div class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-2 xl:grid-cols-4">
    <!-- Number of time model updated with someone else's model card -->
    <div
      class="flex items-center justify-between p-4 bg-white rounded-md dark:bg-darker"
    >
      <div>
        <h6
          class="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase dark:text-primary-light"
        >
          # of Averaging
        </h6>
        <span class="text-xl font-semibold">{{
          trainingInformant.nbrUpdatesWithOthers
        }}</span>
      </div>
      <div>
        <span>
          <svg
            class="w-12 h-12 text-gray-300 dark:text-primary-dark"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="-6 -3 24 24"
            stroke="currentColor"
          >
            <path
              d="M8 2a.5.5 0 0 1 .5.5V4a.5.5 0 0 1-1 0V2.5A.5.5 0 0 1 8 2zM3.732 3.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707zM2 8a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 8zm9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5zm.754-4.246a.389.389 0 0 0-.527-.02L7.547 7.31A.91.91 0 1 0 8.85 8.569l3.434-4.297a.389.389 0 0 0-.029-.518z"
            />
            <path
              fill-rule="evenodd"
              d="M6.664 15.889A8 8 0 1 1 9.336.11a8 8 0 0 1-2.672 15.78zm-4.665-4.283A11.945 11.945 0 0 1 8 10c2.186 0 4.236.585 6.001 1.606a7 7 0 1 0-12.002 0z"
            />
          </svg>
        </span>
      </div>
    </div>

    <!-- How much time I've been waiting for weights to arrive -->
    <div
      class="flex items-center justify-between p-4 bg-white rounded-md dark:bg-darker"
    >
      <div>
        <h6
          class="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase dark:text-primary-light"
        >
          Waiting Time
        </h6>
        <span class="text-xl font-semibold"
          >{{ trainingInformant.waitingTime }} sec</span
        >
      </div>
      <div>
        <span>
          <svg
            class="w-12 h-12 text-gray-300 dark:text-primary-dark"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="-6 -3 24 24"
            stroke="currentColor"
          >
            <path
              d="M2 1.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1h-11a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1-.5-.5zm2.5.5v1a3.5 3.5 0 0 0 1.989 3.158c.533.256 1.011.791 1.011 1.491v.702c0 .7-.478 1.235-1.011 1.491A3.5 3.5 0 0 0 4.5 13v1h7v-1a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351v-.702c0-.7.478-1.235 1.011-1.491A3.5 3.5 0 0 0 11.5 3V2h-7z"
            />
          </svg>
        </span>
      </div>
    </div>

    <!-- Nbr. of Weight Requests -->
    <div
      class="flex items-center justify-between p-4 bg-white rounded-md dark:bg-darker"
    >
      <div>
        <h6
          class="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase dark:text-primary-light"
        >
          # Weight Requests
        </h6>
        <span class="text-xl font-semibold">{{
          trainingInformant.nbrWeightRequests
        }}</span>
      </div>
      <div>
        <span>
          <svg
            class="w-12 h-12 text-gray-300 dark:text-primary-dark"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="-6 0 20 20"
            stroke="currentColor"
          >
            <path
              d="M5.921 11.9 1.353 8.62a.719.719 0 0 1 0-1.238L5.921 4.1A.716.716 0 0 1 7 4.719V6c1.5 0 6 0 7 8-2.5-4.5-7-4-7-4v1.281c0 .56-.606.898-1.079.62z"
            />
          </svg>
        </span>
      </div>
    </div>

    <!-- Nbr. of people helped -->
    <div
      class="flex items-center justify-between p-4 bg-white rounded-md dark:bg-darker"
    >
      <div>
        <h6
          class="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase dark:text-primary-light"
        >
          # of People Helped
        </h6>
        <span class="text-xl font-semibold">{{
          trainingInformant.whoReceivedMyModel.size
        }}</span>
      </div>
      <div>
        <span>
          <svg
            class="w-12 h-12 text-gray-300 dark:text-primary-dark"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="-6 -3 24 24"
            stroke="currentColor"
          >
            <path
              d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
            />
            <path
              fill-rule="evenodd"
              d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"
            />
            <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
          </svg>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TrainingInformationFrame',
  props: {
    trainingInformant: Object,
  },
};
</script>

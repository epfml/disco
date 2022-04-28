<template>
  <!-- Progress Bar -->
  <div class="w-full py-6">
    <div class="flex">
      <!-- Step 1 -->
      <div class="w-1/4">
        <div class="relative mb-2">
          <!-- Icon -->
          <div
            class="w-10 h-10 mx-auto rounded-full text-lg text-white flex items-center"
            :class="isActive(0) ? 'bg-green-500' : 'bg-white border-2 border-gray-200'"
          >
            <span
              class="text-center w-full"
              :class="isActive(0) ? 'text-white' : 'text-gray-700'"
            >
              <svg
                class="w-full fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path
                  class="heroicon-ui"
                  d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2zm14 8V5H5v6h14zm0 2H5v6h14v-6zM8 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"
                />
              </svg>
            </span>
          </div>
        </div>
        <!-- Text -->
        <div class="text-xs text-center md:text-base">
          Choose Task
        </div>
      </div>
      <!-- Step 2 -->
      <div class="w-1/4">
        <div class="relative mb-2">
          <!-- Horizontal Line --->
          <div
            class="absolute flex align-center items-center align-middle content-center"
            style="width: calc(100% - 2.5rem - 1rem); top: 50%; transform: translate(-50%, -50%)"
          >
            <div class="w-full bg-gray-200 rounded items-center align-middle align-center flex-1">
              <div
                class="w-0 bg-green-300 py-1 rounded"
                style="width: 0%;"
              />
            </div>
          </div>
          <!-- Icon -->
          <div
            class="w-10 h-10 mx-auto rounded-full text-lg text-white flex items-center"
            :class="isActive(1) ? 'bg-green-500' : 'bg-white border-2 border-gray-200'"
          >
            <span
              class="text-center w-full"
              :class="isActive(1) ? 'text-white' : 'text-gray-700'"
            >
              <svg
                class="w-full fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path
                  class="heroicon-ui"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </span>
          </div>
        </div>
        <!-- Text -->
        <div class="text-xs text-center md:text-base">
          Connect Data
        </div>
      </div>
      <!-- Step 3 -->
      <div class="w-1/4">
        <div class="relative mb-2">
          <!-- Horizontal Line -->
          <div
            class="absolute flex align-center items-center align-middle content-center"
            style="width: calc(100% - 2.5rem - 1rem); top: 50%; transform: translate(-50%, -50%)"
          >
            <div class="w-full bg-gray-200 rounded items-center align-middle align-center flex-1">
              <div
                class="w-0 bg-green-300 py-1 rounded"
                style="width: 0%;"
              />
            </div>
          </div>
          <!-- Icon -->
          <div
            class="w-10 h-10 mx-auto rounded-full text-lg text-white flex items-center"
            :class="isActive(2) ? 'bg-green-500' : 'bg-white border-2 border-gray-200'"
          >
            <span
              class="text-center w-full"
              :class="isActive(2) ? 'text-white' : 'text-gray-700'"
            >
              <svg
                class="w-full fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path
                  class="heroicon-ui"
                  d="M9 4.58V4c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v.58a8 8 0 0 1 1.92 1.11l.5-.29a2 2 0 0 1 2.74.73l1 1.74a2 2 0 0 1-.73 2.73l-.5.29a8.06 8.06 0 0 1 0 2.22l.5.3a2 2 0 0 1 .73 2.72l-1 1.74a2 2 0 0 1-2.73.73l-.5-.3A8 8 0 0 1 15 19.43V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.58a8 8 0 0 1-1.92-1.11l-.5.29a2 2 0 0 1-2.74-.73l-1-1.74a2 2 0 0 1 .73-2.73l.5-.29a8.06 8.06 0 0 1 0-2.22l-.5-.3a2 2 0 0 1-.73-2.72l1-1.74a2 2 0 0 1 2.73-.73l.5.3A8 8 0 0 1 9 4.57zM7.88 7.64l-.54.51-1.77-1.02-1 1.74 1.76 1.01-.17.73a6.02 6.02 0 0 0 0 2.78l.17.73-1.76 1.01 1 1.74 1.77-1.02.54.51a6 6 0 0 0 2.4 1.4l.72.2V20h2v-2.04l.71-.2a6 6 0 0 0 2.41-1.4l.54-.51 1.77 1.02 1-1.74-1.76-1.01.17-.73a6.02 6.02 0 0 0 0-2.78l-.17-.73 1.76-1.01-1-1.74-1.77 1.02-.54-.51a6 6 0 0 0-2.4-1.4l-.72-.2V4h-2v2.04l-.71.2a6 6 0 0 0-2.41 1.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
                />
              </svg>
            </span>
          </div>
        </div>
        <!-- Text -->
        <div class="text-xs text-center md:text-base">
          Train Your Model
        </div>
      </div>
      <!-- Step 4 -->
      <div class="w-1/4">
        <div class="relative mb-2">
          <!-- Horizontal -->
          <div
            class="absolute flex align-center items-center align-middle content-center"
            style="width: calc(100% - 2.5rem - 1rem); top: 50%; transform: translate(-50%, -50%)"
          >
            <div class="w-full bg-gray-200 rounded items-center align-middle align-center flex-1">
              <div
                class="w-0 bg-green-300 py-1 rounded"
                style="width: 0%;"
              />
            </div>
          </div>
          <!-- Icon -->
          <div
            class="w-10 h-10 mx-auto rounded-full text-lg text-white flex items-center"
            :class="isActive(3) ? 'bg-green-500' : 'bg-white border-2 border-gray-200'"
          >
            <span
              class="text-center w-full"
              :class="isActive(3) ? 'text-white' : 'text-gray-700'"
            >
              <svg
                class="w-full fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path
                  class="heroicon-ui"
                  d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-2.3-8.7l1.3 1.29 3.3-3.3a1 1 0 0 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-2-2a1 1 0 0 1 1.4-1.42z"
                />
              </svg>
            </span>
          </div>
        </div>
        <!-- Text -->
        <div class="text-xs text-center md:text-base">
          Finished
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ProgressBar',
  props: {
    step: {
      type: Number,
      default: 0
    },
    blocked: {
      type: Boolean,
      default: false
    },
    blockedStep: {
      type: Number,
      default: 0
    }
  },
  methods: {
    isActive (step: number): boolean {
      if (this.blocked) {
        return step === this.blockedStep
      } else {
        return step <= this.step
      }
    }
  }
}
</script>

<template>
  <div>
    <!-- Progress Bar -->
    <div class="w-full py-6">
      <div class="flex">
        <div class="w-1/4">
          <div class="relative mb-2">
            <div class="w-10 h-10 mx-auto bg-disco-blue rounded-full text-lg text-white flex items-center">
              <span class="text-center text-white w-full">
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

          <div
            class="text-xs text-center md:text-base"
            style="cursor:pointer"
            onmouseover="this.style.fontSize='110%'"
            onmouseout="this.style.fontSize='100%'"
            @click="goToInformation()"
          >
            Fundamentals
          </div>
        </div>

        <div class="w-1/4">
          <div class="relative mb-2">
            <div
              class="absolute flex align-center items-center align-middle content-center"
              style="width: calc(100% - 2.5rem - 1rem); top: 50%; transform: translate(-50%, -50%)"
            >
              <div class="w-full bg-gray-200 rounded items-center align-middle align-center flex-1">
                <div
                  class="w-0 bg-disco-blue py-1 rounded"
                  style="width: 0%;"
                />
              </div>
            </div>

            <div class="w-10 h-10 mx-auto bg-white border-2 border-gray-200 rounded-full text-lg text-white flex items-center">
              <span class="text-center text-gray-600 w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-full fill-current"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                  width="24"
                  height="24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div
            class="text-xs text-center md:text-base"
            style="cursor:pointer"
            onmouseover="this.style.fontSize='110%'"
            onmouseout="this.style.fontSize='100%'"
            @click="goToFeatures()"
          >
            Features
          </div>
        </div>

        <div class="w-1/4">
          <div class="relative mb-2">
            <div
              class="absolute flex align-center items-center align-middle content-center"
              style="width: calc(100% - 2.5rem - 1rem); top: 50%; transform: translate(-50%, -50%)"
            >
              <div class="w-full bg-gray-200 rounded items-center align-middle align-center flex-1">
                <div
                  class="w-0 bg-disco-blue py-1 rounded"
                  style="width: 0%;"
                />
              </div>
            </div>

            <div class="w-10 h-10 mx-auto bg-white border-2 border-gray-200 rounded-full text-lg text-white flex items-center">
              <span class="text-center text-gray-600 w-full">
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

          <div
            class="text-xs text-center md:text-base"
            style="cursor:pointer"
            onmouseover="this.style.fontSize='110%'"
            onmouseout="this.style.fontSize='100%'"
            @click="goToTutorial()"
          >
            Tutorial
          </div>
        </div>

        <div class="w-1/4">
          <div class="relative mb-2">
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

            <div class="w-10 h-10 mx-auto bg-white border-2 border-gray-200 rounded-full text-lg text-white flex items-center">
              <span class="text-center text-gray-600 w-full">
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

          <div
            class="text-xs text-center md:text-base"
            style="cursor:pointer"
            onmouseover="this.style.fontSize='110%'"
            onmouseout="this.style.fontSize='100%'"
            @click="goToFurther()"
          >
            Further Information
          </div>
        </div>
      </div>
    </div>

    <!-- Page Content -->
    <section class="flex-col items-center justify-center p-4 space-y-4">
      <card custom-class="hover:text-primary dark:hover:text-light">
        <div class="grid gap-8 p-4 sm:grid-cols-2">
          <!-- Federated insight -->
          <div class="flex flex-col items-center mx-auto">
            <h6
              class="
              text-xl
              font-large
              font-bold
              leading-none
              tracking-wider
              text-disco-cyan
              px-2
              py-6
            "
            >
              {{ $tm('information.federatedTitle') }}
            </h6>
            <div class="flex justify-center my-md">
              <img :src="federatedImage">
            </div>
            <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
              <div class="py-6">
                <p>- Server coordinates secure collaborative learning of model</p>
              </div>
            </ul>
          </div>
          <!-- Decentralised insight -->
          <div class="flex flex-col items-center mx-auto">
            <h6
              class="
              text-xl
              font-large
              font-bold
              leading-none
              tracking-wider
              text-disco-blue
              px-2
              py-6
            "
            >
              {{ $tm('information.decentralisedTitle') }}
            </h6>
            <div class="flex justify-center my-md">
              <img :src="decentralisedImage">
            </div>
            <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
              <div class="py-6">
                <p>- Peer2Peer secure collaborative learning of model</p>
              </div>
            </ul>
          </div>
        </div>
        <div
          class="flex justify-center my-md rounded-3xl bg-disco-cyan"
        >
          <ul class="text-lg ont-semibold text-white dark:text-light">
            <div
              class="py-6"
            >
              <p>- Data stays local, always</p>
              <p>- Secure and privacy preserving</p>
              <p>- Collaborative training</p>
            </div>
          </ul>
        </div>
      </card>
    </section>
  </div>
</template>

<script>
import Card from '@/components/containers/Card.vue'
import { useI18n } from 'vue-i18n'

export default {
  name: 'Information',
  components: {
    Card
  },
  setup () {
    const { t, locale } = useI18n()
    return { t, locale }
  },
  data () {
    return {
      federatedImage: require('../../assets/gif/federated_render.gif'),
      decentralisedImage: require('../../assets/gif/decentralized_render.gif')
    }
  },
  methods: {
    goToInformation () {
      this.$router.push({
        path: '/information'
      })
    },
    goToFeatures () {
      this.$router.push({
        path: '/features'
      })
    },
    goToTutorial () {
      this.$router.push({
        path: '/tutorial'
      })
    },
    goToFurther () {
      this.$router.push({
        path: '/further'
      })
    }
  }
}
</script>

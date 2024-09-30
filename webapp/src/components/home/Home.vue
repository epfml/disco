<template>
  <div class="flex flex-col justify-between h-full">
      <div class="flex flex-row flex-wrap justify-between gap-x-4 items-center mb-5 py-2 px-4 bg-purple-200 rounded-md">
        <div class="flex flex-row gap-x-4 items-center">
          <InfoIcon custom-class="min-w-6 min-h-6 w-6 h-6 text-slate-600"/>
          <p class="text-slate-600 text-xs pt-0.5">DISCO is 100% open-source. Use this live demo site to explore and test how it works.</p>
        </div>
        <a target="_blank"
        href="https://framaforms.org/disco-feedback-form-1718716636"
        >
        <div class="flex flex-row flex-wrap shrink-0 items-center gap-x-2 justify-end">
            <p class="text-disco-blue font-bold text-xs hover:underline hover:text-disco-cyan text-end dark:text-disco-dark-cyan">Give us some feedback</p>
          <FeedbackIcon custom-class="min-w-8 min-h-8 w-8 h-8"/>
        </div>
      </a>
  </div>
    <!-- Disco logo -->
    <div class="flex flex-col justify-center items-center mb-8 space-y-4">
      <div class="md:max-w-md lg:max-w-lg">
        <DiscoGIF/>
      </div>
      <span class="text-lg md:text-2xl lg:text-3xl text-center text-slate-300">
        <span class="font-disco text-disco-cyan font-semibold">DIS</span
        >tributed
        <span class="font-disco text-disco-blue font-semibold">CO</span
        >llaborative Learning
      </span>
    </div>
    <div class="flex h-full flex-col justify-center">
      <Landing v-show="!started" @click="started = true" />
      <GetStarted v-show="started" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";

import DiscoGIF from "@/assets/gif/DiscoGIF.vue";
import Landing from "@/components/home/Landing.vue";
import GetStarted from "@/components/home/GetStarted.vue";
import FeedbackIcon from "@/assets/svg/FeedbackIcon.vue";
import InfoIcon from "@/assets/svg/InfoIcon.vue";

const started = ref(false);
</script>

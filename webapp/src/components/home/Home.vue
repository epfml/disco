<template>
  <div class="flex flex-col justify-between grow">
  <div>
    <Card custom-class="mb-5 p-4 bg-orange-100">
      <div class="flex flex-row justify-between gap-x-4 items-center">
        <p class="text-slate-600 text-xs">This website a proof-of-concept. For demo purposes, trained models are not persisted and are reset before every training sessions.</p>
        <a target="_blank"
        href="https://framaforms.org/disco-feedback-form-1718716636"
        >
          <div class="flex flex-row items-center gap-x-2 justify-end">
            <p class="text-disco-blue font-bold text-xs hover:underline hover:text-disco-cyan">Write us some feedback</p>
            <FeedbackIcon custom-class="min-w-8 min-h-8 w-8 h-8"/>
          </div>
        </a>
      </div>
    </Card>
    <!-- Disco logo -->
    <div class="flex flex-col justify-center mb-[8%] space-y-10">
      <DiscoGIF class="mx-auto" />
      <span class="text-3xl text-center text-slate-600">
        <span class="font-disco text-disco-cyan font-semibold">[DIS]</span
        >tributed
        <span class="font-disco text-disco-blue font-semibold">[CO]</span
        >llaborative Learning
      </span>
    </div>
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
import Card from "@/components/containers/Card.vue";
import FeedbackIcon from "@/assets/svg/FeedbackIcon.vue";

const started = ref(false);
</script>

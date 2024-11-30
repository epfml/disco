<template>
  <div class="flex flex-col justify-between h-screen">
    <div
      class="flex flex-row flex-wrap justify-between gap-x-4 items-center mb-5 py-2 px-4 bg-purple-200 rounded-md"
    >
      <div class="flex flex-row gap-x-4 items-center">
        <InfoIcon custom-class="min-w-6 min-h-6 w-6 h-6 text-slate-600" />
        <p class="text-slate-600 text-xs pt-0.5">
          DISCO is 100% open-source. Use this live demo site to explore and test
          how it works.
        </p>
      </div>
      <a
        target="_blank"
        href="https://framaforms.org/disco-feedback-form-1718716636"
      >
        <div
          class="flex flex-row flex-wrap shrink-0 items-center gap-x-2 justify-end"
        >
          <p
            class="text-disco-blue font-bold text-xs hover:underline hover:text-disco-cyan text-end dark:text-disco-dark-cyan"
          >
            Give us some feedback
          </p>
          <FeedbackIcon custom-class="min-w-8 min-h-8 w-8 h-8" />
        </div>
      </a>
    </div>
    <!-- Disco logo -->
    <div class="flex flex-col justify-center items-center space-y-4">
      <div class="md:max-w-md lg:max-w-lg">
        <DiscoGIF class="bg-slate-100 rounded-lg pb-8 px-4" />
      </div>
      <span
        class="text-lg md:text-2xl lg:text-3xl text-center text-slate-600 dark:text-slate-300"
      >
        <span class="font-disco text-disco-cyan font-semibold">DIS</span
        >tributed
        <span class="font-disco text-disco-blue font-semibold">CO</span
        >llaborative Learning
      </span>
    </div>
    <div class="pb-14">
      <p
        class="text-lg md:text-2xl lg:text-4xl text-slate-600 dark:text-slate-300"
      >
        Enables collaborative and privacy-preserving training of machine
        learning models
      </p>
    </div>
  </div>

  <!-- Information -->

  <div
    class="flex flex-col items-stretch m-8 text-justify py-3 sm:text-2xl md:text-2xl lg:text-2xl xlg:text-3xl"
  >
    <div class="flex my-8 p-6 align-center">
      <img
        class="max-h-64 max-w-3xl mx-auto px-5"
        src="@/assets/svg/real_time_collaboration.svg"
        alt=""
      />
      <p class="w-1/2 text-justify text-2xl pr-4">
        Disco is an easy-to-use mobile app and web software that enables
        collaborative and privacy-preserving training of machine learning
        models, running directly in your browser. Leveraging federated and
        decentralized learning, Disco ensures seamless collaboration while
        maintaining data privacy.
      </p>
    </div>

    <div class="grid lg:grid-cols-2 gap-x-9 my-8 mx-2 lg:my-8">
      <div class="flex flex-col md:my-6">
        <h6
          class="font-bold text-justify leading-none text-xl tracking-wider sm:text-2xl md:text-3xl lg:text-3xl xlg:text-4xl"
        >
          Federated Learning
        </h6>
        <p
          class="text-xl text-justify py-3 sm:text-2xl md:text-2xl lg:text-2xl xlg:text-3xl"
        >
          The key insight is to share weight updates instead of data - each user
          trains on their own device and periodically shares weight updates with
          a central server, while keeping data local at all times. The server
          will agreggate all these weights between participants, and send them
          back.
        </p>
      </div>
      <FederatedGIF
        class="bg-slate-100 rounded-lg border-slate-300 border-4 mt-4 lg:mt-0"
      />
    </div>
    <div class="grid lg:grid-cols-2 gap-x-9 my-8 mx-2 lg:my-8">
      <DecentralizedGIF
        class="bg-slate-100 rounded-lg border-slate-300 border-4 mt-4 lg:mt-0"
      />
      <div class="flex flex-col md:my-6 lg:mt-0">
        <h6
          class="font-bold text-justify leading-none text-xl tracking-wider mt-3 sm:text-2xl md:text-3xl lg:text-3xl lg:text-right xlg:text-4xl"
        >
          Decentralized Learning
        </h6>
        <p
          class="text-xl text-justify py-3 sm:text-2xl md:text-2xl lg:text-2xl xlg:text-3xl"
        >
          Building upon the same principles as in federated learning,
          decentralized learning achieved allows collaboration and data privacy
          without the need for a central coordinator. Updates are shared purely
          via peer2peer communication. Disco puts users in control of the entire
          collaborative training process, without a central point of failure.
        </p>
      </div>
    </div>

    <div
      class="flex flex-col justify-center mx-2 lg:my-8 text-xl text-justify py-3 sm:text-2xl md:text-2xl lg:text-2xl xlg:text-3xl"
    >
      <h6
        class="font-bold mx-auto mb-8 text-justify leading-none text-xl tracking-wider sm:text-2xl md:text-3xl lg:text-3xl xlg:text-4xl"
      >
        Why use Disco?
      </h6>
      <div class="flex justify-between">
        <div class="mx-10 w-2/5">
          <p class="mb-4 font-bold text-xlg text-left">
            Supports arbitrary deep learning architectures
          </p>

          <span class="text-lg"
            >Disco supports arbitrary deep learning tasks and model
            architectures, running on your device via TensorFlow.js</span
          >
        </div>

        <div class="mx-10 w-2/5">
          <p class="mb-4 font-bold text-xlg">Data and model privacy</p>
          <span class="text-lg">
            Data privacy by design - no data ever leaves any device. Models
            updates can be protected by encryption (secure multiparty
            computation), and by differential privacy.
          </span>
        </div>

        <div class="mx-10 w-2/5">
          <p class="mb-4 font-bold text-xlg">Runs anywhere</p>
          <span class="text-lg">
            Disco runs in the browser, from any device equipped with a modern
            browser. For developers, we also offer a standalone node.js version,
            not needing any browser.
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- <div class="flex flex-col justify-center">
    <Landing v-show="!started" @click="started = true" />
    <GetStarted v-show="started" />
  </div> -->
</template>
<script lang="ts" setup>
import { ref } from "vue";

import DiscoGIF from "@/assets/gif/DiscoGIF.vue";
import Landing from "@/components/home/Landing.vue";
import GetStarted from "@/components/home/GetStarted.vue";
import FeedbackIcon from "@/assets/svg/FeedbackIcon.vue";
import InfoIcon from "@/assets/svg/InfoIcon.vue";
import FederatedGIF from "@/assets/gif/FederatedGIF.vue";
import DecentralizedGIF from "@/assets/gif/DecentralizedGIF.vue";

const started = ref(false);
</script>

<template>
  <div class="flex flex-col justify-between lg:h-svh">
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
    <div class="flex flex-col justify-center items-center space-y-4 m-8">
      <div class="w-full sm:pb-2 lg:w-5/12">
        <DiscoLogoBoule class="px-4" />
      </div>
      <span
        class="text-lg sm:text-2xl md:text-3xl text-center text-slate-600 dark:text-slate-300"
      >
        <span class="font-disco text-disco-cyan font-semibold">DIS</span
        >tributed
        <span class="font-disco text-disco-blue font-semibold">CO</span
        >llaborative Learning
      </span>
    </div>
    <div class="px-4 pt-20 sm:pt-28 text-justify lg:pb-14 lg:pt-0">
      <p
        class="text-lg sm:text-2xl lg:text-4xl text-slate-600 dark:text-slate-300"
      >
        Enables collaborative and privacy-preserving training of machine
        learning models
      </p>
    </div>
  </div>

  <!-- Information -->

  <div
    class="flex flex-col space-y-10 mt-8 text-justify py-3 sm:text-2xl md:text-2xl lg:text-2xl xlg:text-3xl"
  >
    <div class="flex flex-col space-y-10 p-6 lg:flex-row">
      <img
        class="max-h-64 max-w-80 sm:max-h-72 sm:max-w-screen-sm mx-auto"
        src="@/assets/svg/real_time_collaboration.svg"
        alt=""
      />
      <p class="lg:w-1/2 text-justify text-2xl pr-4">
        Disco is an easy-to-use mobile app and web software that enables
        collaborative and privacy-preserving training of machine learning
        models, running directly in your browser. Leveraging federated and
        decentralized learning, Disco ensures seamless collaboration while
        maintaining data privacy.
      </p>
    </div>

    <div class="grid px-6 lg:grid-cols-2 gap-x-14 mx-2">
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
    <div class="grid px-6 lg:grid-cols-2 gap-x-14 mx-2 lg:my-8">
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
      <div
        class="flex flex-col gap-y-4 justify-between lg:flex-row lg:gap-x-14"
      >
        <div class="lg:w-2/5">
          <p class="my-3 font-bold text-xlg text-left">
            Supports arbitrary deep learning architectures
          </p>

          <span class="text-lg"
            >Disco supports arbitrary deep learning tasks and model
            architectures, running on your device via TensorFlow.js</span
          >
        </div>

        <div class="lg:w-2/5">
          <p class="my-3 font-bold text-xlg">Data and model privacy</p>
          <span class="text-lg">
            Data privacy by design - no data ever leaves any device. Models
            updates can be protected by encryption (secure multiparty
            computation), and by differential privacy.
          </span>
        </div>

        <div class="lg:w-2/5">
          <p class="my-3 font-bold text-xlg">Runs anywhere</p>
          <span class="text-lg">
            Disco runs in the browser, from any device equipped with a modern
            browser. For developers, we also offer a standalone node.js version,
            not needing any browser.
          </span>
        </div>
      </div>
    </div>
    <div class="flex flex-col justify-center">
      <!-- <Landing v-show="!started" @click="started = true" /> -->
      <h6
        class="font-bold mx-auto mb-8 text-justify leading-none text-xl tracking-wider sm:text-2xl md:text-3xl lg:text-3xl xlg:text-4xl"
      >
        GET STARTED
      </h6>
      <GetStarted />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";

import GetStarted from "@/components/home/GetStarted.vue";
import FeedbackIcon from "@/assets/svg/FeedbackIcon.vue";
import InfoIcon from "@/assets/svg/InfoIcon.vue";
import FederatedGIF from "@/assets/gif/FederatedGIF.vue";
import DecentralizedGIF from "@/assets/gif/DecentralizedGIF.vue";
import DiscoLogoBoule from "@/assets/svg/DiscoLogoBoule.vue";

const started = ref(false);
</script>

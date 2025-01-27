<template>
  <div class="flex flex-col justify-between pb-12 h-svh">
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
      <div class="w-full lg:w-2/3 xl:w-3/6">
        <LogoDisco class="px-4" />
      </div>
      <span
        class="text- xl sm:text-2xl md:text-3xl text-slate-600 dark:text-slate-300"
      >
        <span class="font-disco text-disco-cyan font-semibold">DIS</span
        >tributed
        <span class="font-disco text-disco-blue font-semibold">CO</span
        >llaborative Learning
      </span>
    </div>
    <p
      class="text-xl sm:text-2xl md:text-3xl lg:text-3xl text-slate-600 dark:text-slate-300"
    >
      Enables collaborative and privacy-preserving training of machine learning
      models
    </p>
  </div>
  <!-- Information -->
  <div
    class="grid grid-cols-1 gap-8 mx-3 lg:mx-4 text-slate-600 dark:text-slate-300"
  >
    <div class="grid grid-cols-1 gap-y-6 lg:grid-cols-2 place-items-center">
      <RealTimeCollaboration class="w-full h-full lg:w-4/5 h-4/5" />
      <p class="text-base sm:text-xl md:text-2xl lg:tetx-3xl">
        Disco is an easy-to-use mobile app and web software that enables
        collaborative and privacy-preserving training of machine learning
        models, running directly in your browser. Leveraging federated and
        decentralized learning, Disco ensures seamless collaboration while
        maintaining data privacy.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 place-items-center lg:grid-cols-2">
      <div class="flex flex-col gap-y-2">
        <h6
          class="font-semibold text-justify leading-none text-xl tracking-wider sm:text-2xl md:text-3xl xlg:text-3xl"
        >
          Federated Learning
        </h6>
        <FederatedGIF
          class="bg-slate-100 rounded-lg border-slate-300 border-4 mt-4 lg:mt-0"
        />
      </div>
      <p class="text-base sm:text-xl md:text-2xl lg:tetx-3xl">
        The key insight is to share weight updates instead of data - each user
        trains on their own device and periodically shares weight updates with a
        central server, while keeping data local at all times. The server will
        agreggate all these weights between participants, and send them back.
      </p>
    </div>
    <div class="grid grid-cols-1 gap-4 place-items-center lg:grid-cols-2">
      <div>
        <p class="text-base sm:text-xl md:text-2xl lg:tetx-3xl">
          Building upon the same principles as in federated learning,
          decentralized learning achieved allows collaboration and data privacy
          without the need for a central coordinator. Updates are shared purely
          via peer2peer communication. Disco puts users in control of the entire
          collaborative training process, without a central point of failure.
        </p>
      </div>
      <div class="flex flex-col gap-y-2">
        <h6
          class="font-semibold text-justify leading-none text-xl tracking-wider sm:text-2xl md:text-3xl lg:text-3xl lg:text-right xlg:text-4xl"
        >
          Decentralized Learning
        </h6>
        <DecentralizedGIF
          class="bg-slate-100 rounded-lg border-slate-300 border-4 mt-4 lg:mt-0"
        />
      </div>
    </div>

    <div class="flex flex-col items-center text-justify gap-y-6">
      <h6
        class="font-semibold text-justify leading-none text-xl tracking-wider sm:text-2xl md:text-3xl lg:text-3xl xlg:text-4xl"
      >
        Why use Disco?
      </h6>
      <div class="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-3">
        <div class="flex flex-col">
          <p class="font-semibold text-lg md:text-xl lg:text-2xl">
            Supports arbitrary deep learning architectures
          </p>
          <span class="text-base md:text-lg lg:text-xl"
            >Disco supports arbitrary deep learning tasks and model
            architectures, running on your device via TensorFlow.js</span
          >
        </div>
        <div class="flex flex-col">
          <p class="font-semibold text-lg md:text-xl lg:text-2xl">
            Data and model privacy
          </p>
          <span class="text-base md:text-lg lg:text-xl">
            Data privacy by design - no data ever leaves any device. Models
            updates can be protected by encryption (secure multiparty
            computation), and by differential privacy.
          </span>
        </div>
        <div class="flex flex-col">
          <p class="font-semibold text-lg md:text-xl lg:text-2xl">
            Runs anywhere
          </p>
          <span class="text-base md:text-lg lg:text-xl">
            Disco runs in the browser, from any device equipped with a modern
            browser. For developers, we also offer a standalone node.js version,
            not needing any browser.
          </span>
        </div>
      </div>
    </div>
    <div class="flex flex-col justify-center">
      <ButtonsCard
        class="lg:w-2/6 mx-auto"
        title-align="center"
        :buttons="List.of(['get started', goToTaskList])"
      >
        <template #title>
          Train a model and contribute to existing
          <span title="Click Participate to learn more on DISCOllaboratives">
            <DISCOllaboratives />
          </span>
        </template>
      </ButtonsCard>
    </div>
  </div>
</template>

<script lang="ts" setup>
import FeedbackIcon from "@/assets/svg/FeedbackIcon.vue";
import InfoIcon from "@/assets/svg/InfoIcon.vue";
import FederatedGIF from "@/assets/gif/FederatedGIF.vue";
import DecentralizedGIF from "@/assets/gif/DecentralizedGIF.vue";
import LogoDisco from "@/assets/svg/DiscoLogo.vue";
import RealTimeCollaboration from "@/assets/svg/RealTimeCollaboration.vue";
import { useRouter } from "vue-router";
import { List } from "immutable";
import DISCOllaboratives from "@/components/simple/DISCOllaboratives.vue";
import ButtonsCard from "@/components/containers/ButtonsCard.vue";

const router = useRouter();

function goToTaskList(): void {
  router.push({ path: "/list" });
}
</script>

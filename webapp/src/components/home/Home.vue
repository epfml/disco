<template>
  <div class="flex flex-col justify-between h-full">
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
    <div class="flex flex-col justify-center items-center mb-8 space-y-4">
      <div class="md:max-w-md lg:max-w-lg">
        <DiscoGIF class="bg-slate-100 rounded-lg pb-8 px-4" />
      </div>
      <span
        class="text-lg md:text-5xl lg:text-5xl text-center text-slate-600 dark:text-slate-300"
      >
        <span class="font-disco text-disco-cyan font-semibold">DIS</span
        >tributed
        <span class="font-disco text-disco-blue font-semibold">CO</span
        >llaborative Learning
      </span>
    </div>

    <!-- Information -->
    <div class="grid lg:grid-cols-2 gap-x-9 my-4 mx-2 lg:my-8">
      <div class="flex flex-col md:my-6">
        <h6
          class="font-bold text-justify leading-none text-xl tracking-wider sm:text-2xl md:text-3xl lg:text-3xl xlg:text-4xl"
        >
          Federated Learning
        </h6>
        <p
          class="text-xl text-justify py-3 sm:text-2xl md:text-2xl lg:text-2xl xlg:text-3xl"
        >
          The server puts in common local model updates and sends back an
          aggregated global model. <br />No data is shared.
        </p>
      </div>
      <FederatedGIF
        class="bg-slate-100 rounded-lg border-slate-300 border-4 mt-4 lg:mt-0"
      />
    </div>
    <div class="grid lg:grid-cols-2 gap-x-9 my-4 mx-2 lg:my-8">
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
          class="text-xl text-justify py-3 sm:text-2xl md:text-2xl lg:text-2xl lg:text-right xlg:text-3xl"
        >
          Local model aggregation is coordinated between peers without any
          server.
          <br />
          No data is shared.
        </p>
      </div>
    </div>

    <div
      class="flex flex-col mb-4 mx-2 lg:my-8 text-xl text-justify py-3 sm:text-2xl md:text-2xl lg:text-2xl xlg:text-3xl"
    >
      <h6
        class="font-bold text-justify leading-none text-xl tracking-wider sm:text-2xl md:text-3xl lg:text-3xl mb-3 xlg:text-4xl"
      >
        Why use Disco?
      </h6>
      <div class="mb-4">
        <b>Supports arbitrary deep learning architectures</b><br />
        Disco supports arbitrary deep learning tasks and model architectures,
        running on your device via TensorFlow.js
      </div>

      <div class="mb-4">
        <b>Data and model privacy</b><br />
        Data privacy by design - no data ever leaves any device. Models updates
        can be protected by encryption (secure multiparty computation), and by
        differential privacy.
      </div>

      <div class="mb-4">
        <b>Runs anywhere</b><br />
        Disco runs in the browser, from any device equipped with a modern
        browser. For developers, we also offer a standalone node.js version, not
        needing any browser.
      </div>
    </div>

    <div
      class="flex flex-col mb-4 mx-2 lg:my-8 text-xl text-justify py-3 sm:text-2xl md:text-2xl lg:text-2xl xlg:text-3xl"
    >
      <h6
        class="font-bold text-justify leading-none text-xl tracking-wider sm:text-2xl md:text-3xl lg:text-3xl mb-3 xlg:text-4xl"
      >
        Further Information
      </h6>

      <div class="mb-4">
        <b>Goal</b><br />
        Disco enables collaborative and privacy-preserving training of machine
        learning models. Disco is an easy-to-use mobile app & web software,
        running directly in your browser.
      </div>

      <div class="mb-4">
        <b>Key Question</b><br />
        Can we keep control over our own data, while still benefitting from
        joint collaborative training with other participants? - or - Can we
        train an ML model which is equally good as if all data were in one
        place, but while respecting privacy? Federated and decentralized
        learning make this possible.
      </div>

      <!-- <div class="mb-4">
        <b>Federated learning</b><br />
        The key insight is to share weight updates instead of data - each user
        trains on their own device and periodically shares weight updates with a
        central server, while keeping data local at all times. The server will
        agreggate all these weights between participants, and send them back.
      </div>

      <div class="mb-4">
        <b>Decentralized learning</b><br />
        Building upon the same principles as in federated learning,
        decentralized learning achieved allows collaboration and data privacy
        without the need for a central coordinator. Updates are shared purely
        via peer2peer communication. Disco puts users in control of the entire
        collaborative training process, without a central point of failure.
      </div> -->

      <div class="mb-4">
        <b>Foundation technology</b>
        <br /><DISCO /> uses a public model-private data approach. The models
        are trained on the web app via
        <a class="text-blue-400" href="https://www.tensorflow.org/js">TF.js</a>
        Decentralized training uses peer2peer communication (<a
          class="text-blue-400"
          href="https://github.com/feross/simple-peer"
          >simple-peer</a
        >, or peerJS).
      </div>

      <div class="mb-4">
        <b>Research-focused design</b>
        <br /><DISCO /> aims to enable decentralized training of machine
        learning algorithms, which is (i) efficient (<a
          class="text-blue-400"
          href="https://github.com/epfml/powergossip"
          >R1</a
        >,<a class="text-blue-400" href="https://github.com/epfml/ChocoSGD"
          >R2</a
        >), (ii) privacy-preserving (<a
          class="text-blue-400"
          href="https://arxiv.org/abs/2006.04747"
          >R3</a
        >), (iii) fault-tolerant and responsive (<a
          class="text-blue-400"
          href="https://arxiv.org/abs/1910.12308"
          >R4</a
        >), (iv) robust to malicious actors (<a
          class="text-blue-400"
          href="https://arxiv.org/abs/2012.10333"
          >R5</a
        >,<a class="text-blue-400" href="https://arxiv.org/abs/2006.09365">R6</a
        >), while supporting (iv) fair participation, (v) transparency and (vi)
        interpretability.
      </div>
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
import FederatedGIF from "@/assets/gif/FederatedGIF.vue";
import DecentralizedGIF from "@/assets/gif/DecentralizedGIF.vue";

const started = ref(false);
</script>

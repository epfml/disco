<template>
    <!-- Further Information -->
  <div class="flex justify-center">
    <IconCard class="justify-self-center w-full lg:w-4/5">
      <template #title> Further Information </template>

      <div class="mb-4">
        <b>Goal</b><br>
        Disco enables collaborative and privacy-preserving training of machine learning models. Disco is an easy-to-use mobile app & web software, running directly in your browser.
      </div>

      <div class="mb-4">
        <b>Key Question</b><br>
        Can we keep control over our own data, while still benefitting from joint collaborative training with other participants? - or - Can we train an ML model which is equally good as if all data were in one place, but while respecting privacy? Federated and decentralized learning make this possible.
      </div>

      <div class="mb-4">
        <b>Federated learning</b><br>
        The key insight is to share weight updates instead of data - each user trains on their own device and periodically shares weight updates with a central server, while keeping data local at all times. The server will agreggate all these weights between participants, and send them back.
      </div>

      <div class="mb-4">
        <b>Decentralized learning</b><br>
        Building upon the same principles as in federated learning, decentralized learning achieved allows collaboration and data privacy without the need for a central coordinator. Updates are shared purely via peer2peer communication. Disco puts users in control of the entire collaborative training process, without a central point of failure.
      </div>

      <div class="mb-4">
          <b>Foundation technology</b>
          <br/><DISCO /> uses a public model-private data approach.
          The models are trained on the web app via
          <a
            class="text-blue-400"
            href="https://www.tensorflow.org/js"
          >TF.js</a>
          Decentralized training uses peer2peer communication (<a
            class="text-blue-400"
            href="https://github.com/feross/simple-peer"
          >simple-peer</a>, or peerJS).
      </div>

      <div class="mb-4">
          <b>Research-focused design</b>
          <br/><DISCO /> aims to enable decentralized training of
          machine learning algorithms, which is (i) efficient (<a
            class="text-blue-400"
            href="https://github.com/epfml/powergossip"
          >R1</a>,<a
            class="text-blue-400"
            href="https://github.com/epfml/ChocoSGD"
          >R2</a>), (ii) privacy-preserving (<a
            class="text-blue-400"
            href="https://arxiv.org/abs/2006.04747"
          >R3</a>), (iii) fault-tolerant and responsive (<a
            class="text-blue-400"
            href="https://arxiv.org/abs/1910.12308"
          >R4</a>), (iv) robust to malicious actors (<a
            class="text-blue-400"
            href="https://arxiv.org/abs/2012.10333"
          >R5</a>,<a
            class="text-blue-400"
            href="https://arxiv.org/abs/2006.09365"
          >R6</a>), while supporting (iv) fair participation, (v) transparency and (vi) interpretability.
      </div>
    </IconCard>
  </div>
</template>

<script lang="ts" setup>
import { onActivated } from 'vue'

import { useInformationStore } from "@/store";
import IconCard from '@/components/containers/IconCard.vue'
import DISCO from '@/components/simple/DISCO.vue'

const informationStore = useInformationStore()
onActivated(() => { informationStore.step = 3 })
</script>

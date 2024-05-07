<template>
    <!-- Further Information -->
  <div class="flex justify-center">
    <IconCard class="justify-self-center w-full lg:w-4/5">
      <template #title>
        {{ $tm('information.informationTitle') }}
      </template>
      <template #content>
        <div
          v-for="card in $tm('information.informationCard') "
          :key="(card as any).title"
            class="mb-4"
        >
          <b>{{ (card as any).title }}</b><br>
          <p>{{ (card as any).text }}</p>
      </div>
      <div class="mb-4">
          <b>Foundation technology</b>
          <br/>DISCO uses a public model-private data approach.
          The models are trained on the web app via
          <a
            class="text-blue-600"
            href="https://www.tensorflow.org/js"
          >TF.js</a>
          Decentralized training uses peer2peer communication (<a
            class="text-blue-600"
            href="https://peerjs.com/"
          >peerjs</a>).
      </div>
      <div class="mb-4">
          <b>Research-focused design</b>
          <br/>DISCO aims to enable decentralized training of
          machine learning algorithms, which is (i) efficient (<a
            class="text-blue-600"
            href="https://github.com/epfml/powergossip"
          >R1</a>,<a
            class="text-blue-600"
            href="https://github.com/epfml/ChocoSGD"
          >R2</a>), (ii) privacy-preserving (<a
            class="text-blue-600"
            href="https://arxiv.org/abs/2006.04747"
          >R3</a>), (iii) fault-tolerant and responsive (<a
            class="text-blue-600"
            href="https://arxiv.org/abs/1910.12308"
          >R4</a>), (iv) robust to malicious actors (<a
            class="text-blue-600"
            href="https://arxiv.org/abs/2012.10333"
          >R5</a>,<a
            class="text-blue-600"
            href="https://arxiv.org/abs/2006.09365"
          >R6</a>), while supporting (iv) fair participation, (v) transparency and (vi) interpretability.
      </div>
      </template>
    </IconCard>
  </div>
</template>

<script lang="ts" setup>
import { onActivated } from 'vue'

import { useInformationStore } from '@/store/information'
import IconCard from '@/components/containers/IconCard.vue'

// TODO fix i18n types

const informationStore = useInformationStore()
onActivated(() => { informationStore.step = 3 })
</script>

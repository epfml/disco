<template>
  <div>
    <!-- Further Information -->
    <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
      <Card custom-class="hover:text-primary dark:hover:text-light">
        <h6
          class="
            text-xl
            font-large
            leading-none
            tracking-wider
            dark:group-hover:text-light
            px-2
            py-6
          "
        >
          {{ $tm('information.informationTitle') }}
        </h6>
        <div class="ml-10">
          <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
            <Card
              v-for="card in $tm('information.informationCard')"
              :key="(card as any).title"
              custom-class="hover:text-primary dark:hover:text-light"
            >
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  <b>{{ (card as any).title }}</b>
                  {{
                    (card as any).text
                  }}
                </ul>
              </div>
            </Card>
            <Card custom-class="hover:text-primary dark:hover:text-light">
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  <b>Foundation technology:</b>
                  DISCO uses a public model-private data approach.
                  The models are trained on the web app via
                  <a
                    class="text-blue-600"
                    href="https://www.tensorflow.org/js"
                  >TF.js</a>
                  Decentralized training uses peer2peer communication (<a
                    class="text-blue-600"
                    href="https://peerjs.com/"
                  >peerjs</a>).
                </ul>
              </div>
            </Card>
            <!--
              To further seperate the text from the UI i18 interpolation can be be used:
              https://kazupon.github.io/vue-i18n/guide/interpolation.html
             -->

            <Card custom-class="hover:text-primary dark:hover:text-light">
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  <b>Research-focused design:</b>
                  DISCO aims to enable decentralized training of
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
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Card from '@/components/containers/Card.vue'

// TODO fix i18n types
</script>

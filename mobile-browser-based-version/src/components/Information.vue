<template>
  <base-layout :withSection="true" customClass="pt-4">
    <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
      <card customClass="hover:text-primary dark:hover:text-light">
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
            <card
              customClass="hover:text-primary dark:hover:text-light"
              v-for="card in $tm('information.informationCard')"
              :key="card.title"
            >
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  <b>{{ card.title }}</b>
                  {{
                    card.text
                  }}
                </ul>
              </div>
            </card>

            <card customClass="hover:text-primary dark:hover:text-light">
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  <b>Technology behind DeAI:</b>
                  The ML models are trained on the web app via
                  <a class="text-blue-600" href="https://www.tensorflow.org/js"
                    >TF.js</a
                  >, and for the decentralized platform we use peer2peer
                  communication using
                  <a class="text-blue-600" href="https://peerjs.com/">peerjs</a>
                </ul>
              </div>
            </card>

            <!-- 
              To further seperate the text from the UI i18 interpolation can be be used:
              https://kazupon.github.io/vue-i18n/guide/interpolation.html
             -->

            <card customClass="hover:text-primary dark:hover:text-light">
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  <b>Science behind DeAI:</b>
                  In this project we aim to build and improve decentralized
                  versions of current machine learning algorithms, which are at
                  the same time (i) efficient (<a
                    class="text-blue-600"
                    href="https://github.com/epfml/powergossip"
                    >R1</a
                  >,<a
                    class="text-blue-600"
                    href="https://github.com/epfml/ChocoSGD"
                    >R2</a
                  >), (ii) privacy-preserving (<a
                    class="text-blue-600"
                    href="https://arxiv.org/abs/2006.04747"
                    >R3</a
                  >), (iii) fault-tolerant and dynamic over time (<a
                    class="text-blue-600"
                    href="https://arxiv.org/abs/1910.12308"
                    >R4</a
                  >), (iv) robust to malicious actors (<a
                    class="text-blue-600"
                    href="https://arxiv.org/abs/2012.10333"
                    >R5</a
                  >,<a
                    class="text-blue-600"
                    href="https://arxiv.org/abs/2006.09365"
                    >R6</a
                  >), and (iv) support fair incentives and transparency on the
                  resulting utility of trained ML models. We currently follow a
                  public model, private data approach.
                </ul>
              </div>
            </card>
          </div>

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
            {{ $tm('information.featuresTitle') }}
          </h6>
          <div class="ml-10">
            <div
              class="grid grid-cols-2 gap-4 p-4 lg:grid-cols-2 xl:grid-cols-2"
            >
              <card
                customClass="hover:text-primary dark:hover:text-light"
                v-for="card in $tm('information.featuresCard')"
                :key="card.title"
              >
                <div class="ml-10">
                  <ul
                    class="text-lg ont-semibold text-gray-500 dark:text-light"
                  >
                    <b>{{ card.title }}</b>
                    {{
                      card.text
                    }}
                  </ul>
                </div>
              </card>
            </div>
          </div>

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
            {{ $tm('information.howToUseTitle') }}
          </h6>
          <div class="ml-10">
            <div
              class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1"
            >
              <card
                customClass="hover:text-primary dark:hover:text-light"
                v-for="card in $tm('information.howToUseCard')"
                :key="card.title"
              >
                <div class="ml-10">
                  <ul
                    class="text-lg ont-semibold text-gray-500 dark:text-light"
                  >
                    <b>{{ card.title }}</b>
                    {{
                      card.text
                    }}
                  </ul>
                </div>
              </card>
            </div>
            <h6
              class="
                text-xl
                font-large
                leading-none
                tracking-wider
                dark:group-hover:text-light
                p-2
                py-6
              "
            >
              {{ $tm('information.furtherLinksTitle') }}
            </h6>
            <ul class="text-lg ont-semibold text-gray-500 dark:text-light p-4">
              This app was developped in the Machine Learning and Optimization
              Laboratory at EPFL.
              <br />
              More information about decentralized learning
              <a
                href="https://www.epfl.ch/labs/mlo/"
                target="_blank"
                class="text-blue-500 hover:underline"
                >here</a
              >.
              <br />
              The source code of the app can be found on
              <a
                href="https://github.com/epfml/DeAI"
                target="_blank"
                class="text-blue-500 hover:underline"
                >Github</a
              >.
              <br />
              Finally, you can join our
              <a
                href="https://deai.slack.com/"
                target="_blank"
                class="text-blue-500 hover:underline"
                >Slack</a
              >
              page to discuss the app.
            </ul>
          </div>
        </div>
      </card>
    </div>
  </base-layout>
</template>

<script>
import BaseLayout from './containers/BaseLayout.vue';
import Card from './containers/Card.vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'information',
  setup() {
    const { t, locale } = useI18n();
    return { t, locale };
  },
  components: {
    BaseLayout,
    Card,
  },
  methods: {
    goToLabPage() {},
  },
};
</script>

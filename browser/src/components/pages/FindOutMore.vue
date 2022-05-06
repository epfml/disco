<template>
  <base-layout
    :with-section="true"
    custom-class="pt-4"
  >
    <section class="flex-col items-center justify-center p-4 space-y-4">
      <card custom-class="hover:text-primary dark:hover:text-light">
        <div class="grid gap-8 p-4 sm:grid-cols-2">
          <!-- Decentralised insight -->
          <div class="flex flex-col items-center mx-auto">
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
              {{ $tm('findoutmore.images.decentralised.title') }}
            </h6>
            <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
              {{ $t('findoutmore.images.decentralised.text') }}
            </ul>
            <div class="flex justify-center my-md">
              <decentralized-image class="sm:w-full md:w-3/5" />
            </div>
          </div>

          <!-- Federated insight -->
          <div class="flex flex-col items-center mx-auto">
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
              {{ $tm('findoutmore.images.federated.title') }}
            </h6>
            <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
              {{ $t('findoutmore.images.federated.text') }}
            </ul>
            <div class="flex justify-center my-md">
              <federated-image class="sm:w-full md:w-3/5" />
            </div>
          </div>
        </div>
      </card>
    </section>

    <!-- Why use Disco? / Features -->
    <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1 blue">
      <card custom-class="hover:text-primary dark:hover:text-light">
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
          {{ $tm('findoutmore.featuresTitle') }}
        </h6>
        <div class="ml-10">
          <card
            v-for="card in $tm('findoutmore.featuresCard')"
            :key="card.title"
            custom-class="hover:text-primary dark:hover:text-light"
          >
            <div class="ml-10">
              <ul
                class="text-lg ont-semibold text-gray-500 dark:text-light"
              >
                <b>{{ card.title }}</b><br>
                {{
                  card.text
                }}
              </ul>
            </div>
          </card>
        </div>
      </card>
    </div>

    <!-- How to use Disco? -->
    <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
      <card custom-class="hover:text-primary dark:hover:text-light">
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
          {{ $tm('findoutmore.howToUseTitle') }}
        </h6>
        <div class="ml-10">
          <div
            class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1"
          >
            <card
              v-for="card in $tm('findoutmore.howToUseCard')"
              :key="card.title"
              custom-class="hover:text-primary dark:hover:text-light"
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
        <div class="flex items-center justify-center space-x-8">
          <!-- Light button -->
          <custom-button
            :center="true"
            @click="goToTaskList()"
          >
            {{
              "Explore examples"
            }}
          </custom-button>
          <custom-button
            :center="true"
            @click="goToNewTaskCreationForm()"
          >
            {{
              "Create your own task"
            }}
          </custom-button>
        </div>
      </card>
    </div>

    <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
      <card custom-class="hover:text-primary dark:hover:text-light">
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
          {{ $tm('findoutmore.informationTitle') }}
        </h6>
        <div class="ml-10">
          <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
            <card
              v-for="card in $tm('findoutmore.informationCard')"
              :key="card.title"
              custom-class="hover:text-primary dark:hover:text-light"
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
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
          <card custom-class="hover:text-primary dark:hover:text-light">
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
              {{ $tm('findoutmore.informationTitle') }}
            </h6>
            <div class="ml-10">
              <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
                <card
                  v-for="card in $tm('findoutmore.informationCard')"
                  :key="card.title"
                  custom-class="hover:text-primary dark:hover:text-light"
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

                <card custom-class="hover:text-primary dark:hover:text-light">
                  <div class="ml-10">
                    <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                      <b>Technology behind Disco:</b>
                      The machine learning models are trained on the web app via
                      <a
                        class="text-blue-600"
                        href="https://www.tensorflow.org/js"
                      >TF.js</a>, and for the decentralized platform we use peer2peer
                      communication using
                      <a
                        class="text-blue-600"
                        href="https://peerjs.com/"
                      >peerjs</a>.
                    </ul>
                  </div>
                </card>

                <!--
              To further seperate the text from the UI i18 interpolation can be be used:
              https://kazupon.github.io/vue-i18n/guide/interpolation.html
             -->

                <card custom-class="hover:text-primary dark:hover:text-light">
                  <div class="ml-10">
                    <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                      <b>Science behind Disco:</b>
                      In this project we aim to build and improve decentralized
                      versions of current machine learning algorithms, which are at
                      the same time (i) efficient (<a
                        class="text-blue-600"
                        href="https://github.com/epfml/powergossip"
                      >R1</a>,<a
                        class="text-blue-600"
                        href="https://github.com/epfml/ChocoSGD"
                      >R2</a>), (ii) privacy-preserving (<a
                        class="text-blue-600"
                        href="https://arxiv.org/abs/2006.04747"
                      >R3</a>), (iii) fault-tolerant and dynamic over time (<a
                        class="text-blue-600"
                        href="https://arxiv.org/abs/1910.12308"
                      >R4</a>), (iv) robust to malicious actors (<a
                        class="text-blue-600"
                        href="https://arxiv.org/abs/2012.10333"
                      >R5</a>,<a
                        class="text-blue-600"
                        href="https://arxiv.org/abs/2006.09365"
                      >R6</a>), and (iv) support fair incentives and transparency on the
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
                p-2
                py-6
              "
              >
                {{ $tm('findoutmore.externalLinksTitle') }}
              </h6>
              <ul class="text-lg ont-semibold text-gray-500 dark:text-light p-4">
                This app was developed in the
                <a
                  href="https://www.epfl.ch/labs/mlo/"
                  target="_blank"
                  class="text-blue-500 hover:underline"
                >Machine Learning and Optimization Laboratory</a> at EPFL.
                <br>
                Explore the source code, documentation and ask questions in
                <a
                  href="https://github.com/epfml/disco"
                  target="_blank"
                  class="text-blue-500 hover:underline"
                >Github</a>.
                <br>
                Finally, you can join our
                <a
                  href="https:/disco-decentralized.slack.com/"
                  target="_blank"
                  class="text-blue-500 hover:underline"
                >Slack</a>
                page to contribute to the app.
              </ul>
            </div>
          </card>
        </div>
      </card>
    </div>
  </base-layout>
</template>

<script>
import BaseLayout from '../containers/BaseLayout.vue'
import Card from '../containers/Card.vue'
import FederatedImage from '../../assets/svg/FederatedImage.vue'
import DecentralizedImage from '../../assets/svg/DecentralizedImage.vue'
import CustomButton from '../simple/CustomButton.vue'
import { useI18n } from 'vue-i18n'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'FindOutMore',
  components: {
    BaseLayout,
    Card,
    CustomButton,
    DecentralizedImage,
    FederatedImage
  },
  setup () {
    const { t, locale } = useI18n()
    return { t, locale }
  },
  methods: {
    goToTaskList () {
      this.$router.push({
        path: '/list'
      })
    },
    goToNewTaskCreationForm () {
      this.$router.push({
        path: '/create'
      })
    }
  }
})
</script>

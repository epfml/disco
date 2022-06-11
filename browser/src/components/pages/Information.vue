<template>
  <div>
    <section class="flex-col items-center justify-center p-4 space-y-4">
      <card custom-class="hover:text-primary dark:hover:text-light">
        <div class="grid gap-8 p-4 sm:grid-cols-2">
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
              {{ $tm('information.images.federated.title') }}
            </h6>
            <div class="flex justify-center my-md">
              <img :src="federatedImage">
            </div>
            <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
              <div class="py-6">
                <p>- Users update their models upon server's response</p>
              </div>
            </ul>
          </div>
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
              {{ $tm('information.images.decentralised.title') }}
            </h6>
            <div class="flex justify-center my-md">
              <img :src="decentralisedImage">
            </div>
            <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
              <div class="py-6">
                <p>- peer2peer communication</p>
              </div>
            </ul>
          </div>
        </div>
        <div
          class="flex justify-center my-md"
          style="background:#6096BA"
        >
          <ul class="text-lg ont-semibold text-white dark:text-light">
            <div
              class="py-6"
            >
              <p>- Data stays local, always</p>
              <p>- Secure and privacy preserving</p>
              <p>- Collaborative training</p>
            </div>
          </ul>
        </div>
      </card>
    </section>
  </div>
</template>

<script>
import Card from '@/components/containers/Card.vue'
import { useI18n } from 'vue-i18n'

export default {
  name: 'Information',
  components: {
    Card
  },
  setup () {
    const { t, locale } = useI18n()
    return { t, locale }
  },
  data () {
    return {
      federatedImage: require('../../assets/public/federated_rev3.gif'),
      decentralisedImage: require('../../assets/public/decentralized_rev2.gif')
    }
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
}
</script>

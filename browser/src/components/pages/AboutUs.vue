<template>
  <BaseLayout
    :with-section="true"
  >
    <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
      <Card custom-class="hover:text-primary dark:hover:text-light">
        <div class="ml-10">
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
            About Us
          </h6>
          <img :src="mloLogo">
          <ul class="text-lg ont-semibold text-gray-500 dark:text-light p-4">
            This app was developed in the Machine Learning and Optimization
            Laboratory at EPFL.
            <br>
            Visit the our
            <a
              href="https://www.epfl.ch/labs/mlo/"
              target="_blank"
              class="text-blue-500 hover:underline"
            >page</a> to learn more about our lab and projects.
            <br><br>
            The source code of the app can be found on the
            <a
              href="https://github.com/epfml/disco"
              target="_blank"
              class="text-blue-500 hover:underline"
            >Disco Github</a> page.
            <br>
            If you want to run Disco locally or want to contribute, please go to the
            <a
              href="https://github.com/epfml/disco/blob/develop/DEV.md"
              target="_blank"
              class="text-blue-500 hover:underline"
            >Developer section</a>.
            <br><br>
            Finally, you can join our
            <a
              href="https:/disco-decentralized.slack.com/"
              target="_blank"
              class="text-blue-500 hover:underline"
            >Slack</a>
            page to discuss the app.
          </ul>
        </div>
      </Card>
    </div>
  </BaseLayout>
</template>

<script lang="ts">
import BaseLayout from '@/components/containers/BaseLayout.vue'
import Card from '@/components/containers/Card.vue'
import { useI18n } from 'vue-i18n'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AboutUs',
  components: {
    BaseLayout,
    Card
  },
  setup () {
    const { t, locale } = useI18n()
    return { t, locale }
  },
  data () {
    return {
      mloLogo: require('../../assets/images/mlologo.png')
    }
  }
})
</script>

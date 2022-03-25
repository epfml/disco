<template>
  <base-layout :withSection="true" customClass="pt-4">
    <div class="box-border h-32 w-32 p-4 border-4 border-gray-200 bg-blue-100 rounded">
      <h2>Developed in the Machine Learning and Optimization Laboratory at EPFL, Disco enables collaborative and privacy-preserving
        training of machine learning models. Disco offers both decentralized and federated learning.<br /><br />
        We follow an open development process - you're more than welcome to join the conversation on our Slack space,
        as well as on the issues pages on Github.</h2>
     </div>
    <!-- Links -->
    <div class="grid md:grid-cols-3 gap-8 m-8">
    <!-- LAB -->
      <div class="box-border h-32 w-32 p-4 bg-blue-200">
        <a href="https://www.epfl.ch/labs/mlo/" target="_blank" class="float space-x-4">
          <i class="fa-solid fa-diagram-project"></i>
          <span class="text font-bold">Visit ML&O</span>
        </a>
      </div>
      <!-- Github -->
      <div class="box-border h-32 w-32 p-4 bg-blue-200">
        <a href="https://github.com/epfml/disco" target="_blank" class="float space-x-4">
          <i class="fa-brands fa-github"></i>
          <span class="text font-bold">Follow on Github</span>
        </a>
      </div>
      <!-- Slack -->
      <div class="box-border h-32 w-32 p-4 bg-blue-200">
        <a href="https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw" target="_blank" class="float space-x-4">
          <i class="fa-brands fa-slack"></i>
          <span class="text font-bold">Join on Slack</span>
        </a>
      </div>
    </div>
    <!-- Team Members-->
    <section class="mb-32 text-gray-800 text-center"><br />
      <h2 class="text-3xl font-bold mb-12">Our Team</h2><br /><br />
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-x-6 lg:gap-xl-12">
        <div class="mb-12 lg:mb-0">
          <img class="rounded-lg shadow-lg mb-6 mx-auto" src="https://people.epfl.ch/private/common/photos/links/276449.jpg?ts=1647931251" style="height: 150px"/>
          <h5 class="text-lg font-bold">Martin Jaggi</h5>
          <h4>Tenure Track Assistant Professor</h4>
          <p>✉️ martin.jaggi<span class="spamprotection">CHARSEQUENCE</span>@epfl.ch</p>
        </div>
        <div class="mb-12 lg:mb-0">
          <img class="rounded-lg shadow-lg mb-6 mx-auto" src="https://people.epfl.ch/private/common/photos/links/204167.jpg?ts=1647931281" style="height: 150px"/>
          <h5 class="text-lg font-bold">Mary-Anne Hartley</h5>
          <h4>Postdoctoral Researcher</h4>
          <p>✉️ mary-anne.hartley<span class="spamprotection">CHARSEQUENCE</span>@epfl.ch</p>
        </div>
        <div class="mb-12 md:mb-0">
          <img class="rounded-lg shadow-lg mb-6 mx-auto" src="https://avatars.githubusercontent.com/u/17376073?v=4" style="height: 150px" />
          <h5 class="text-lg font-bold">Ignacio S. Aleman </h5>
          <h4>Research Software Engineer</h4>
          <p>✉️ ignaciosaleman<span class="spamprotection">CHARSEQUENCE</span>@gmail.com</p>
        </div>
      </div>
    </section>
  </base-layout>
</template>

<!-- Prevent email crawling -->
<style type="text/css">
  span.spamprotection {display:none;}
</style>

<script lang="ts">
import BaseLayout from './containers/BaseLayout.vue'
import { useI18n } from 'vue-i18n'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'about-page',
  setup () {
    const { t, locale } = useI18n()
    return { t, locale }
  },
  components: {
    BaseLayout
  }
})
</script>

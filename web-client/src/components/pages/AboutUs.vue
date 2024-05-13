<template>
  <div class="flex justify-center">
    <IconCard class="justify-self-center w-full lg:w-4/5">
      <template #title>
        About Us
      </template>
      <template #content>
        <img src="../../assets/images/mlologo.png">
        This app was developed in the Machine Learning and Optimization Laboratory at EPFL.
        <ul>
          Visit the our
          <a
            href="https://www.epfl.ch/labs/mlo/"
            target="_blank"
            class="text-blue-500 hover:underline"
          >page</a> to learn more about our lab and projects.
          <br><br>
          <i class="fa-brands fa-github" />
          &emsp; The source code of the app can be found on the
          <a
            href="https://github.com/epfml/disco"
            target="_blank"
            class="text-blue-500 hover:underline"
          >Disco Github</a> page.
          <br>
          <i class="fa-solid fa-hat-wizard" />
          &emsp; If you want to run Disco locally or want to contribute, please go to the
          <a
            href="https://github.com/epfml/disco/blob/develop/DEV.md"
            target="_blank"
            class="text-blue-500 hover:underline"
          >Developer section</a>.
          <br>
          <i class="fa-brands fa-slack" />
          &emsp; Finally, you can join our
          <a
            href="https:/disco-decentralized.slack.com/"
            target="_blank"
            class="text-blue-500 hover:underline"
          >Slack</a>
          page to discuss the app.
        </ul>
      </template>
    </IconCard>
  </div>
</template>

<script lang="ts" setup>
import IconCard from '@/components/containers/IconCard.vue'
</script>

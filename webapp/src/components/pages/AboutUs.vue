<template>
  <div class="flex justify-center">
    <IconCard class="justify-self-center w-full lg:w-4/5">
      <template #title>
        <span class="text-2xl">About Us</span>
      </template>
      <template #content>
        <p class="text-base">
          This app was developed in the Machine Learning and Optimization Laboratory at EPFL.
          <br/>
          Visit the our
          <a
            href="https://www.epfl.ch/labs/mlo/"
          target="_blank"
          class="text-blue-500 hover:underline"
          >
          page
          </a> 
          to learn more about our lab and projects.
        </p>
        <ul class="text-base mt-5">
          <a 
            href="https://github.com/epfml/disco" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <i class="fa-brands fa-github" />
          </a>          
          <span class="ml-5">We're open source! Feel free to see the code on our</span>
          <a
            href="https://github.com/epfml/disco"
            target="_blank"
            class="text-blue-500 hover:underline"
          >Github page</a>.
          <br>
          <a
            href="https://github.com/epfml/disco/blob/develop/DEV.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i class="fa-solid fa-hat-wizard" />
          </a>
          <span class="ml-5">If you want to run Disco locally or want to contribute, please go to the</span>
          <a
            href="https://github.com/epfml/disco/blob/develop/DEV.md"
            target="_blank"
            class="text-blue-500 hover:underline"
          >Developer section</a>.
          <br>
          <a
            href="https://disco-decentralized.slack.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i class="fa-brands fa-slack" />
          </a>
          <span class="ml-5">Finally, you can join our</span>
          <a
            href="https:/disco-decentralized.slack.com/"
            target="_blank"
            class="text-blue-500 hover:underline"
          >Slack</a>
          page to discuss the app.
        </ul>
        <a href="https://www.epfl.ch/labs/mlo/" target="_blank">
          <img src="../../assets/images/mlologo.png" class="w-48 h-auto mt-10">
        </a>
      </template>
    </IconCard>
  </div>
</template>

<script lang="ts" setup>
import IconCard from '@/components/containers/IconCard.vue'
</script>

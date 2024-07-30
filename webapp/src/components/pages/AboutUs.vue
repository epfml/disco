<template>
  <div class="space-y-8 mb-8">
    <h1 class="text-disco-cyan font-disco text-3xl text-center">Who we are</h1>

    <IconCard>
      <template #title> EPFL and Yale </template>

      <p>Disco is being developed by two universities using public funds.</p>

      <ul class="list-disc list-inside">
        <li>
          <a
            href="https://www.epfl.ch/"
            class="text-blue-500 hover:underline"
            target="_blank"
            >Ecole Polytechnique Fédérale of Lausanne</a
          >
          (EPFL), in Switzerland, Europa
        </li>
        <li>
          <a
            href="https://www.yale.edu/"
            class="text-blue-500 hover:underline"
            target="_blank"
            >Yale University</a
          >, in the USA, North America
        </li>
      </ul>

      <p>
        Its source code is open and can be found on
        <a
          href="https://github.com/epfml/disco"
          class="text-blue-500 hover:underline"
          target="_blank"
          >Github</a
        >. You can also join our
        <a
          href="https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw"
          class="text-blue-500 hover:underline"
          target="_blank"
          >Slack channel</a
        >
        to discuss with us.
        <br />
        We do need you support and feedback to improve it. Feel welcome in
        asking any question.
      </p>
    </IconCard>

    <IconCardHeader class="bg-white rounded-xl">
      <template #title>
        <a
          class="hover:underline"
          href="https://www.epfl.ch/labs/mlo/"
          target="_blank"
        >
          Machine Learning and Optimization Laboratory @ EPFL
        </a>
      </template>
      <template #icon> <img src="@/assets/images/mlologo.png" /> </template>
    </IconCardHeader>

    <IconCardHeader class="bg-white rounded-xl">
      <template #title>
        <a
          class="hover:underline"
          href="https://www.yale-light.org/"
          target="_blank"
        >
          Laboratory for Intelligent Global Health & Humanitarian Response
          Technologies @ Yale
        </a>
      </template>
      <template #icon> <img src="@/assets/images/LiGHT.gif" /> </template>
    </IconCardHeader>
  </div>
</template>

<script lang="ts" setup>
import IconCard from "@/components/containers/IconCard.vue";
import IconCardHeader from "@/components/containers/IconCardHeader.vue";
</script>

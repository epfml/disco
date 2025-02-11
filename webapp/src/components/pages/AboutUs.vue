<template>
  <div class="space-y-8 mb-8">
    <h1 class="text-disco-cyan font-disco text-3xl text-center">
      The <DISCO /> team
    </h1>

    <IconCard>
      <template #title> About Us </template>
      <p>
        <DISCO /> is the result of a collaboration between two research labs:
      </p>

      <ul class="list-disc list-inside">
        <li>
          <a
            class="text-blue-500 hover:underline"
            href="https://www.epfl.ch/labs/mlo/"
            target="_blank"
          >MLO</a>
          (Machine Learning and Optimization Laboratory) hosted at
          <a
            href="https://www.epfl.ch/"
            class="text-blue-500 hover:underline"
            target="_blank"
            >EPFL</a
          >, Switzerland
        </li>
        <li>
          <a
            class="text-blue-500 hover:underline"
            href="https://www.light-laboratory.org/"
            target="_blank"
          >LiGHT</a>
          (Laboratory for Intelligent Global Health & Humanitarian Response
          Technologies) hosted at
          <a
            href="https://www.ariadnelabs.org/"
            class="text-blue-500 hover:underline"
            target="_blank"
            >AriadneLabs</a
          >, Boston, USA
        </li>
      </ul>
      <br />
      <p>
        <DISCO /> relies on public funds and its code is open-source and
        accessible on
        <a
          href="https://github.com/epfml/disco"
          class="text-blue-500 hover:underline"
          target="_blank"
          >Github</a
        >. You can reach out to us by email at 
        <a
          href="mailto:discolab@listes.epfl.ch"
          class="text-blue-500 hover:underline"
          target="_blank"
          >discolab AT listes.epfl.ch</a>.<br/>
        Your support and feedback is greatly appreciated.
      </p>

      <!-- Lab logos -->
      <div class="grid gap-8 p-4 sm:grid-cols-2 items-end">
        <!-- MLO logo -->
        <div class="flex flex-col items-center">
          <a
            class="hover:cursor-pointer"
            href="https://www.epfl.ch/labs/mlo/"
            target="_blank"
          >
            <MLOLogo class="w-full h-20 lg:h-48"/>
          </a>
        </div>
        <!-- LiGHT logo -->
        <div class="flex flex-col items-center mb-1">
          <a
            class="hover:mouse-pointer"
            href="https://www.light-laboratory.org/"
            target="_blank"
          >
            <LightLogo class="w-full h-20 lg:h-48" />
          </a>
        </div>
      </div>
    </IconCard>
  </div>
</template>

<script lang="ts" setup>
import DISCO from "@/components/simple/DISCO.vue";
import IconCard from "@/components/containers/IconCard.vue";
import MLOLogo from "@/assets/logos/MLOLogo.vue";
import LightLogo from "@/assets/logos/LightLogo.vue";
</script>

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
          >
            MLO
          </a>
          (Machine Learning and Optimization Laboratory) at
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
            href="https://www.yale-light.org/"
            target="_blank"
          >
            LiGHT
          </a>
          (Laboratory for Intelligent Global Health & Humanitarian Response
          Technologies) at
          <a
            href="https://www.yale.edu/"
            class="text-blue-500 hover:underline"
            target="_blank"
            >Yale</a
          >, US
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
        >.
        <br />
        Your support and feedback would be greatly appreciated.
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
            <LogoMLO class="w-full h-20 lg:h-48" :color="mloTextColor" />
          </a>
        </div>
        <!-- LiGHT logo -->
        <div class="flex flex-col items-center mb-1">
          <a
            class="hover:mouse-pointer"
            href="https://www.yale-light.org/"
            target="_blank"
          >
            <LogoLight class="w-full h-20 lg:h-48" />
          </a>
        </div>
      </div>
    </IconCard>
  </div>
</template>

<script lang="ts" setup>
import DISCO from "@/components/simple/DISCO.vue";
import IconCard from "@/components/containers/IconCard.vue";
import LogoMLO from "@/assets/svg/MLOLogo.vue";
import LogoLight from "@/assets/svg/LightLogo.vue";
import { ref, watch } from "vue";
import { useThemeStore } from "@/store/theme";

const mloTextColor = ref("#000000");

const themeStore = useThemeStore();

watch(
  () => themeStore.currentTheme,
  (newValue) => {
    console.log(newValue);
    if (newValue === "light") {
      mloTextColor.value = "#000000";
      console.log("color", mloTextColor.value);
    } else {
      mloTextColor.value = "#ffffff";
      console.log("dark color", mloTextColor.value);
    }
  },
);
</script>

<template>
  <div
    class="mx-0 lg:mx-8 text-slate-600 dark:text-slate-300"
  >

  <!-- First screen -->
    <div class="mb-20 lg:mb-0 lg:h-dvh flex flex-col justify-around pb-12">
  <!-- Disco logo -->
    <div class="flex flex-col justify-center items-center space-y-4">
        <div class="">
          <DiscoGIF v-if="themeStore.current == 'light'" class="pb-4"/>
          <DiscoLogo v-else class="w-[640px] h-[264px]"/>
        </div>
        <span
          class="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-slate-600 dark:text-slate-300"
        >
          <span class="font-disco text-disco-cyan font-semibold">DIS</span
          >tributed
          <span class="font-disco text-disco-blue font-semibold">CO</span
          >llaborative Learning
        </span>
      </div>
      <div class="text-center md:text-left mt-24">
        <p
          class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold
          text-slate-700 dark:text-white leading-9"
        >
          Train AI Models Together.<br/>
          Keep Data Private.
        </p>
        <p class="text-base sm:text-base md:text-lg lg:text-xl
          text-slate-600 dark:text-slate-300 mt-3"
        >
          Build and train AI models without sharing any data. <br/>
          Machine Learning directly in your browser.
        </p>
        <div class="flex justify-center mb-12">
          <button
            type="button"
            @click="goToTaskList()"
            class="
            mt-4 px-6 py-3 min-w-[8rem]
            text-xl text-white tracking-wide
            bg-orange-400 rounded-xl duration-200
            hover:scale-105 transform
            drop-shadow-[0px_0px_5px_rgba(251,146,60,0.5)]
            hover:drop-shadow-[0px_0px_10px_rgba(251,146,60,0.5)]"
          >
            Start training
          </button>
        </div>
      </div>
    </div>

<!-- 2nd screen -->
    <div class="mb-40 lg:mb-0 lg:h-dvh flex flex-col lg:flex-row gap-16 justify-center items-center">
      <div class="flex flex-col justify-center text-center lg:text-right items-center lg:items-end">
        <span
        class="text-4xl lg:text-5xl xl:text-6xl font-semibold
        text-slate-700 dark:text-white"
        >
          Simple by design.
        </span>
        <span class="text-lg mt-4">
          Disco runs fully in your browser.<br/>
          No need to install anything.<br/>
          No need to code anything.
        </span>
      </div>
      <MultiDeviceIcon class="w-2/5 h-2/5 min-w-[250px] drop-shadow-[0_5px_5px_rgba(0,0,0,0.25)]"/>
    </div>
<!-- 3nd screen -->
    <div class="mb-40 lg:pb-40 flex flex-col">
      <div class="flex flex-col items-around justify-start w-full">
        <div class="mb-8 lg:mb-20 w-full text-center lg:text-left">
          <span class="text-4xl lg:text-5xl font-semibold text-slate-700 dark:text-white">
            3 steps.
          </span>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-x-16 gap-y-8 place-items-start">
          <div class="flex flex-col gap-8 justify-center items-center text-center w-full">
            <span class="text-2xl lg:text-3xl font-semibold text-slate-700 dark:text-white">
              Connect your data
            </span>
            <ConnectDataIcon class="w-[150px] h-[150px] lg:w-[300px] lg:h-[200px] drop-shadow-lg"/>
          </div>
          <div class="flex flex-col gap-8 justify-center items-center text-center w-full">
            <span class="text-2xl lg:text-3xl font-semibold text-slate-700 dark:text-white">
              Join the session
            </span>
            <LaunchIcon class="w-[150px] h-[150px] lg:w-[300px] lg:h-[200px] drop-shadow-md"/>
          </div>
          <div class="flex flex-col gap-8 justify-center items-center text-center w-full">
            <span class="text-2xl lg:text-3xl font-semibold text-slate-700 dark:text-white">
              Use the model
            </span>
            <CompletedIcon class="w-[150px] h-[150px] lg:w-[300px] lg:h-[200px] drop-shadow-md"/>
          </div>
        </div>
      </div>
    </div>
<!-- 4th screen -->
    <div class="mb-20 lg:mb-0 lg:h-dvh flex flex-col justify-around">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 place-items-start">
        <span
          class="text-4xl lg:text-5xl font-semibold
          text-slate-700 dark:text-white text-left"
          >
          Your data, your rules.
        </span>
        <span class="text-lg w-full md:w-2/3 xl:w-full max-w-[500px]">
          <b>Your data is never shared and never leave your device.</b><br/>
          You set your privacy level. Train via federated learning or decentralized learning for extra security, 
          choose the encryption algorithm and privacy mechanisms.
        </span>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 place-items-center pb-20 mt-12 lg:mt-0">
        <div class="flex flex-col items-center">
          <span class="text-center text-2xl font-semibold">
            Federated Learning
          </span>
          <span class="text-center text-lg">
            More efficient, orchestrated by on a central server
          </span>
          <FederatedGIF
            class="w-full md:w-2/3 lg:w-full mt-4 rounded-lg dark:bg-slate-100 dark:border-slate-300 dark:border-4"
          />
        </div>
        <div class="flex flex-col items-center">
          <span class="text-center text-2xl font-semibold">
            Decentralized Learning
          </span>
          <span class="text-center text-lg">
            More secure, peer-to-peer technology
          </span>
          <DecentralizedGIF
            class="w-full md:w-2/3 lg:w-full mt-4 rounded-lg dark:bg-slate-100 dark:border-slate-300 dark:border-4"
          />
        </div>
      </div>
    </div>

<!-- 5th screen -->
    <div class="mb-40 lg:mb-0 flex flex-col gap-16 justify-center items-center">
      <div class="w-full flex flex-col justify-center text-center items-center">
        <span
        class="text-4xl lg:text-5xl font-semibold
        text-slate-700 dark:text-white"
        >
          Design your own AI model.
        </span>
        <span class="text-lg mt-4 w-full lg:w-2/5 max-w-[500px]">
          Disco supports a wide range of deep learning architectures and tasks ranging from image classification to training Transformers model.
        </span>
      </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 place-items-center gap-4 gap-y-8">
        <span class="text-3xl font-semibold text-slate-700 dark:text-white">
          Powered by
        </span>
          <a 
            class="flex justify-center"
            href="https://www.tensorflow.org/js" target="_blank"
          >
            <TensorflowLogo class="w-2/3 min-w-[50px]"/>
          </a>
          <a
            class="flex justify-center" 
            href="https://onnx.ai/" target="_blank"
          >
            <ONNXLogo class="w-4/5 min-w-[50px]"/>
          </a>
      </div>
    </div>
  <!-- 6th screen -->
    <div class="lg:h-dvh lg:pt-16 flex flex-col gap-16 justify-center items-center">
      <div class="w-full flex flex-col justify-center text-center items-center lg:items-start lg:text-left">
        <span
        class="text-4xl lg:text-5xl font-semibold
        text-slate-700 dark:text-white"
        >
          Free and open source.
        </span>
        <span class="text-lg mt-4 w-full lg:w-2/5 max-w-[500px]">
          Disco is a non-profit academic initiative. <br/>
          Open-source and free to use.
        </span>
      </div>
        <div class="mt-8 w-full grid grid-cols-1 lg:grid-cols-4 place-items-center gap-x-4 gap-y-16 ">
          <a
            class="flex justify-center" 
            href="https://www.epfl.ch/labs/mlo/" target="_blank"
          >
            <MLOLogo class="w-full"/>
          </a>
          <a
            class="flex justify-center ml-4" 
            href="https://www.light-laboratory.org/" target="_blank"
          >
            <LightLogo class="w-4/5"/>
          </a>
          <a
            class="flex justify-center ml-4" 
            href="https://www.light-laboratory.org/" target="_blank"
          >
            <AriadneLabsLogo class="w-full"/>
          </a>
          <a
            class="flex justify-center ml-4" 
            href="https://www.light-laboratory.org/" target="_blank"
          >
            <CMUAfricaLogo class="w-full max-h-[100px]"/>
          </a>
      </div>
      <div class="mb-20 lg:mb-0 flex flex-wrap justify-center gap-x-8">
          <button
            type="button"
            @click="goToTaskList()"
            class="
            mt-4 px-6 py-3 min-w-[8rem]
            text-xl text-white tracking-wide
            bg-orange-400 rounded-xl duration-200
            hover:drop-shadow-[0px_0px_10px_rgba(251,146,60,0.5)]"
          >
            Get started
          </button>
          <a
            href="mailto:discolab@listes.epfl.ch"
            target="_blank"
            class="
            mt-4 px-6 py-3 min-w-[8rem]
            text-xl dark:text-white tracking-wide
            outline outline-1 outline-slate-400 rounded-xl
            hover:outline-2"
          >
            Contact us
        </a>
        </div>
    </div>
  </div> 
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";

import DiscoGIF from "@/assets/gif/DiscoGIF.vue";
import DiscoLogo from "@/assets/logos/DiscoLogo.vue";
import TensorflowLogo from "@/assets/logos/TensorflowLogo.vue";
import ONNXLogo from "@/assets/logos/ONNXLogo.vue";
import LightLogo from "@/assets/logos/LightLogo.vue";
import MLOLogo from "@/assets/logos/MLOLogo.vue";
import AriadneLabsLogo from "@/assets/logos/AriadneLabsLogo.vue";
import CMUAfricaLogo from "@/assets/logos/CMUAfricaLogo.vue";

import FederatedGIF from "@/assets/gif/FederatedGIF.vue";
import DecentralizedGIF from "@/assets/gif/DecentralizedGIF.vue";

import ConnectDataIcon from "@/assets/svg/ConnectDataIcon.vue";
import CompletedIcon from "@/assets/svg/CompletedIcon.vue";
import LaunchIcon from "@/assets/svg/LaunchIcon.vue";
import MultiDeviceIcon from "@/assets/svg/MultiDeviceIcon.vue";
import CTAButton from "../simple/CTAButton.vue";
import { useThemeStore } from "@/store";

const themeStore = useThemeStore();

const router = useRouter();

function goToTaskList(): void {
  router.push({ path: "/list" });
}

</script>

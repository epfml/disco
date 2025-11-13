<template>
  <div class="lg:mx-8">

  <!-- First screen -->
    <div class="mb-40 lg:mb-0 h-dvh gap-16 lg:gap-0 flex flex-col justify-around pb-12">
  <!-- Disco logo -->
      <div class="flex flex-col justify-center items-center space-y-4">
        <div class="mx-auto w-full h-full min-w-[250px] max-w-[640px] max-h-[264px]">
          <DiscoLogo v-if="themeStore.current == 'dark'"/>
          <DiscoGIF v-else class="pb-4"/>
        </div>
        <div class="text-center">
          <span
            class="font-disco text-xl md:text-3xl lg:text-4xl"
          >
            <span class="font-disco text-disco-cyan font-bold">DIS</span
            >tributed
            <span class="font-disco text-disco-blue font-bold">CO</span
            >llaborative Learning
          </span>
      </div>
      </div>
      <div class="text-center lg:text-center mt-12">
        <p
          class="font-disco text-4xl lg:text-5xl font-bold
           text-heading-light dark:text-heading-dark"
        >
          Train AI Models Together.<br/>
          Keep Data Private.
        </p>
        <p class="text-base lg:text-lg mt-3">
          Build and train AI models without sharing any data.<br/>
          Machine Learning directly in your browser.
        </p>
      </div>
      <div class="flex justify-center">
        <CTAButton>
          Start training
        </CTAButton>
      </div>
    </div>

<!-- 2nd screen -->
    <div class="mb-40 lg:mb-0 lg:h-dvh flex flex-col lg:flex-row gap-16 justify-center items-center">
      <div class="flex flex-col justify-center text-center items-center ">
        <span
        class="font-disco text-4xl lg:text-5xl font-bold
           text-heading-light dark:text-heading-dark"
        >
        Training in the privacy<br> of your browser.
        </span>
        <span class="text-base lg:text-lg mt-4">
          Disco runs fully in your browser.<br/>
          No need to install anything.<br/>
          No need to code anything.
        </span>
      </div>
      <MultiDeviceIcon class="w-2/5 h-2/5 min-w-[250px] drop-shadow-[0_5px_5px_rgba(0,0,0,0.25)]"/>
    </div>
<!-- 3nd screen -->
    <div class="mb-40 lg:pb-40 lg:mb-0 lg:h-dvh flex flex-col justify-center">
      <div class="flex flex-col items-around justify-start w-full">
        <div class="mb-8 lg:mb-20 w-full text-center lg:text-center">
          <span
            class="font-disco text-4xl lg:text-5xl font-bold text-heading-light dark:text-heading-dark"
          >
            3 steps.
          </span>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-x-16 gap-y-8 place-items-start">
          <div class="flex flex-col justify-center items-center text-center w-full">
            <span class="text-2xl font-bold text-heading-light dark:text-heading-dark">
              Connect your data
            </span>
            <img 
              :src="`https://storage.googleapis.com/deai-313515.appspot.com/gifs/homepage/connect_${themeStore.current}.gif`"
              class="w-[150px] h-[150px] lg:w-[300px] lg:h-[300px]"
            />
          </div>
          <div class="flex flex-col justify-center items-center text-center w-full">
            <span class="text-2xl font-bold text-heading-light dark:text-heading-dark">
              Join the <span 
                v-tippy="{
                  content: 'This is how we call collaborative training sessions in DISCO.',
                  placement: 'top'
                }">
                class="underline hover:cursor-pointer"
                <DISCOllaborative/>
              </span>
            </span>
            <img 
              :src="`https://storage.googleapis.com/deai-313515.appspot.com/gifs/homepage/join_${themeStore.current}.gif`"
              class="w-[150px] h-[150px] lg:w-[300px] lg:h-[300px]"
            />
          </div>
          <div class="flex flex-col justify-center items-center text-center w-full">
            <span class="text-2xl font-bold text-heading-light dark:text-heading-dark">
              Use the model
            </span>
            <img 
              :src="`https://storage.googleapis.com/deai-313515.appspot.com/gifs/homepage/use_${themeStore.current}.gif`"
              class="w-[150px] h-[150px] lg:w-[300px] lg:h-[300px]"
            />
          </div>
        </div>
      </div>
    </div>
<!-- 4th screen -->
    <div class="mb-40 lg:mb-0 lg:h-dvh flex flex-col justify-center gap-16">
      <div class="flex flex-col gap-4 items-center text-center">
        <span
          class="font-disco text-4xl lg:text-5xl font-bold
           text-heading-light dark:text-heading-dark"
          >
          Your data, your rules.
        </span>
        <span class="text-base lg:text-lg">
          <b>Your data is never shared and never leaves your device.</b><br/>
          Choose the privacy mechanisms. You set your privacy level.
        </span>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 place-items-center pb-20">
        <div class="flex flex-col items-center">
          <span class="text-center text-2xl font-bold">
            Federated Learning
          </span>
          <span class="text-center text-base lg:text-lg">
            More efficient, orchestrated by on a central server
          </span>
          <FederatedGIF
            class="w-full md:w-2/3 lg:w-full mt-4 rounded-lg bg-slate-50 border-slate-300 border-4"
          />
        </div>
        <div class="flex flex-col items-center">
          <span class="text-center text-2xl font-bold">
            Decentralized Learning
          </span>
          <span class="text-center text-base lg:text-lg">
            More secure, peer-to-peer technology
          </span>
          <DecentralizedGIF
            class="w-full md:w-2/3 lg:w-full mt-4 rounded-lg bg-slate-50 border-slate-300 border-4"
          />
        </div>
      </div>
    </div>

<!-- 5th screen -->
    <div class="mb-40 lg:mb-0 lg:h-dvh flex flex-col gap-16 justify-center items-center">
      <div class="w-full flex flex-col justify-center text-center items-center">
        <span
        class="font-disco text-4xl lg:text-5xl font-bold
           text-heading-light dark:text-heading-dark"
        >
          Design your own AI model.
        </span>
        <span class="text-base lg:text-lg mt-4 w-full lg:w-2/5 max-w-[500px]">
          Disco supports a wide array of deep learning architectures and tasks from image classification to training Transformers model.
        </span>
      </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 place-items-center gap-4 gap-y-8">
        <span class="text-3xl font-bold text-heading-light dark:text-heading-dark">
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
    <div class="lg:h-dvh flex flex-col gap-16 justify-start items-center">
      <div class="w-full flex flex-col justify-center text-center items-center lg:items-start lg:text-left">
        <span
        class="font-disco text-4xl lg:text-5xl font-bold
           text-heading-light dark:text-heading-dark"
        >
          Free and open source.
        </span>
        <span class="text-base lg:text-lg mt-4 w-full lg:w-2/5 max-w-[500px]">
          Disco is a non-profit academic initiative. <br/>
          Open-source and free to use.
        </span>
      </div>
      <div class="flex flex-col gap-y-8 text-center items-center">
        <span class="text-3xl font-bold text-heading-light dark:text-heading-dark">
          A joint project of
        </span>
        <div class="w-3/4 grid grid-cols-2 place-items-center">
          <a
            class="flex justify-center" 
            href="https://www.epfl.ch/labs/mlo/" target="_blank"
          >
            <MLOLogo class="w-3/4"/>
          </a>
          <a
            class="flex justify-center ml-4" 
            href="https://www.light-laboratory.org/" target="_blank"
          >
            <LightLogo class="w-3/4"/>
          </a>
        </div>
        <span class="mt-4 text-3xl font-bold text-heading-light dark:text-heading-dark">
          Supported by
        </span>
        <div class="w-3/4 grid grid-cols-2 place-items-center">
          <a
            class="flex justify-center ml-4" 
            href="https://www.epfl.ch/en/" target="_blank"
          >
            <EPFL class="w-3/4"/>
          </a>
          <a
            class="flex justify-center ml-4" 
            href="https://www.ariadnelabs.org/" target="_blank"
          >
            <AriadneLabsLogo class="w-full"/>
          </a>
        </div>
      </div>
    </div>
    <!-- 7th screen -->
    <div class="mt-32 lg:mt-0 mb-32 w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
      <div class="flex justify-center">
        <DiscoParticlesIcon class="w-full max-w-[200px] lg:max-w-[400px]"/>
      </div>
      <div class="flex flex-col items-center lg:items-start gap-2 text-center">
        <span
          class="font-disco text-4xl lg:text-5xl font-bold
            text-heading-light dark:text-heading-dark"
          >
          <!-- Call-to-action heading -->
          Join the <DISCO/>
        </span>
        <span class="text-center lg:text-left w-full max-w-[500px] text-base lg:text-lg">
          Start training your AI models privately today.
        </span>
        <div class="mt-4 flex flex-wrap justify-center gap-x-4">
            <CTAButton>
              Get started
            </CTAButton>
            <a
              href="mailto:discolab@listes.epfl.ch"
              target="_blank"
              class="
              px-6 py-3 min-w-32
              text-xl dark:text-white tracking-wide font-disco
              outline outline-1 outline-slate-400 rounded-full
              hover:outline-2"
            >
              Contact us
          </a>
        </div>
      </div>
    </div>
  </div> 
</template>

<script lang="ts" setup>
import DiscoGIF from "@/assets/gif/DiscoGIF.vue";
import DiscoLogo from "@/assets/logos/DiscoLogo.vue";
import TensorflowLogo from "@/assets/logos/TensorflowLogo.vue";
import ONNXLogo from "@/assets/logos/ONNXLogo.vue";
import LightLogo from "@/assets/logos/LightLogo.vue";
import MLOLogo from "@/assets/logos/MLOLogo.vue";
import AriadneLabsLogo from "@/assets/logos/AriadneLabsLogo.vue";

import FederatedGIF from "@/assets/gif/FederatedGIF.vue";
import DecentralizedGIF from "@/assets/gif/DecentralizedGIF.vue";

import MultiDeviceIcon from "@/assets/svg/MultiDeviceIcon.vue";
import CTAButton from "../simple/CTAButton.vue";
import { useThemeStore } from "@/store";
import DISCOllaborative from "../simple/DISCOllaborative.vue";
import DISCO from "../simple/DISCO.vue";
import EPFL from "@/assets/logos/EPFL.vue";
import DiscoParticlesIcon from "@/assets/svg/DiscoParticlesIcon.vue";

const themeStore = useThemeStore();
</script>

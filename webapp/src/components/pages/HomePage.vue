<template>
  <div>
    <!-- First screen -->
    <div :class="paneTw">
      <!-- Disco logo -->
      <div>
        <div>
          <DiscoLogo v-if="themeStore.current == 'dark'" />
          <DiscoGIF v-else class="pb-8" />
        </div>
        <div class="text-center font-disco text-xl md:text-3xl lg:text-4xl">
          <span class="text-disco-cyan font-bold">DIS</span>tributed
          <span class="text-disco-blue font-bold">CO</span>llaborative Learning
        </div>
      </div>
      <div class="text-center">
        <p :class="headingTw">
          Train AI Models Together.<br />
          Keep Data Private.
        </p>
        <p class="lg:text-lg mt-4">
          Build and train AI models without sharing any data.<br />
          Machine Learning directly in your browser.
        </p>
      </div>
      <div>
        <CTAButton> Start training </CTAButton>
      </div>
      <div>
        <ScrollIndicator />
      </div>
    </div>

    <!-- 2nd screen -->
    <div class="lg:flex-row" :class="paneTw">
      <div class="flex flex-col text-center">
        <span :class="headingTw">
          Training in the privacy<br />
          of your browser.
        </span>
        <span class="lg:text-lg mt-4">
          Disco runs fully in your browser.<br />
          No need to install anything.<br />
          No need to code anything.
        </span>
      </div>
      <MultiDeviceIcon
        class="w-2/5 h-2/5 min-w-[250px] drop-shadow-[0_5px_5px_rgba(0,0,0,0.25)]"
      />
    </div>

    <!-- 3nd screen -->
    <div :class="paneTw">
      <div>
        <span :class="headingTw"> 3 steps. </span>
      </div>
      <div
        class="flex flex-col lg:flex-row gap-8 items-center text-center"
        :class="subHeadingTw"
      >
        <div>
          <span> Connect your data </span>
          <img
            :src="`https://storage.googleapis.com/deai-313515.appspot.com/gifs/homepage/connect_${themeStore.current}.gif`"
            class="w-[150px] h-[150px] lg:w-[300px] lg:h-[300px] mx-auto"
          />
        </div>
        <div>
          <span>
            Join the
            <span
              v-tippy="{
                content:
                  'This is how we call collaborative training sessions in DISCO.',
                placement: 'top',
              }"
              class="underline hover:cursor-pointer"
            >
              <DISCOllaborative />
            </span>
          </span>
          <img
            :src="`https://storage.googleapis.com/deai-313515.appspot.com/gifs/homepage/join_${themeStore.current}.gif`"
            class="w-[150px] h-[150px] lg:w-[300px] lg:h-[300px] mx-auto"
          />
        </div>
        <div>
          <span> Use the model </span>
          <img
            :src="`https://storage.googleapis.com/deai-313515.appspot.com/gifs/homepage/use_${themeStore.current}.gif`"
            class="w-[150px] h-[150px] lg:w-[300px] lg:h-[300px] mx-auto"
          />
        </div>
      </div>
    </div>
    <!-- 4th screen -->
    <div :class="paneTw">
      <div class="flex flex-col self-start gap-4">
        <span :class="headingTw"> Your data, your rules. </span>
        <span class="lg:text-lg">
          <b>Your data is never shared and never leaves your device.</b><br />
          Choose the privacy mechanisms. You set your privacy level.
        </span>
      </div>
      <div class="flex flex-col lg:flex-row gap-8">
        <div class="flex flex-col items-center text-center">
          <span :class="subHeadingTw"> Federated Learning </span>
          <span class="lg:text-lg">
            More efficient, orchestrated by on a central server
          </span>
          <FederatedGIF
            class="w-full md:w-2/3 lg:w-full rounded-lg bg-slate-50 border-slate-300 border-4"
          />
        </div>
        <div class="flex flex-col items-center text-center">
          <span :class="subHeadingTw"> Decentralized Learning </span>
          <span class="lg:text-lg"> More secure, peer-to-peer technology </span>
          <DecentralizedGIF
            class="w-full md:w-2/3 lg:w-full rounded-lg bg-slate-50 border-slate-300 border-4"
          />
        </div>
      </div>
    </div>

    <!-- 5th screen -->
    <div :class="paneTw">
      <div class="flex flex-col text-center items-center gap-2">
        <span :class="headingTw"> Design your own AI model. </span>
        <span class="lg:text-lg max-lg:max-w-[500px] lg:w-2/5">
          Disco supports a wide array of deep learning architectures and tasks
          from image classification to training Transformers model.
        </span>
      </div>
      <div class="flex flex-col lg:flex-row items-center justify-center gap-8">
        <span :class="subHeadingTw"> Powered by </span>
        <a href="https://www.tensorflow.org/js" target="_blank">
          <TensorflowLogo class="w-2/3 min-w-[50px] mx-auto" />
        </a>
        <a href="https://onnx.ai/" target="_blank">
          <ONNXLogo class="w-4/5 min-w-[50px] mx-auto" />
        </a>
      </div>
    </div>
    <!-- 6th screen -->
    <div
      class="[&_svg]:size-25 md:[&_svg]:size-35 lg:[&_svg]:size-50 gap-2"
      :class="paneTw"
    >
      <div class="flex flex-col self-start gap-2 mb-16">
        <span :class="headingTw"> Free and open source. </span>
        <span class="lg:text-lg max-lg:max-w-[500px]">
          Disco is a non-profit academic initiative. <br />
          Open-source and free to use.
        </span>
      </div>
      <span :class="subHeadingTw"> A joint project of </span>
      <div class="flex flex-row items-center gap-8">
        <a href="https://www.epfl.ch/labs/mlo/" target="_blank">
          <MLOLogo />
        </a>
        <a href="https://www.light-laboratory.org/" target="_blank">
          <LightLogo />
        </a>
      </div>
      <span :class="subHeadingTw"> Supported by </span>
      <div class="flex flex-row items-center gap-8">
        <a href="https://www.epfl.ch/en/" target="_blank">
          <EPFL />
        </a>
        <a href="https://www.ariadnelabs.org/" target="_blank">
          <AriadneLabsLogo />
        </a>
      </div>
    </div>
    <!-- 7th screen -->
    <div :class="paneTw" class="lg:flex-row">
      <div>
        <DiscoParticlesIcon class="max-w-[200px] lg:max-w-[400px]" />
      </div>
      <div class="flex flex-col gap-2 text-center">
        <span :class="headingTw">
          <!-- Call-to-action heading -->
          Join the <DISCO />
        </span>
        <span class="lg:text-lg">
          Start training your AI models privately today.
        </span>
        <div class="flex flex-row justify-center gap-4">
          <CTAButton> Get started </CTAButton>
          <a
            href="mailto:discolab@listes.epfl.ch"
            target="_blank"
            class="px-6 py-3 min-w-32 text-xl dark:text-white tracking-wide font-disco outline outline-1 outline-slate-400 rounded-full hover:outline-2"
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
import ScrollIndicator from "../simple/ScrollIndicator.vue";

const themeStore = useThemeStore();
const paneTw =
  "min-h-dvh flex flex-col justify-center gap-16 items-center py-8";
const headingTw = "font-disco font-bold text-3xl md:text-4xl lg:text-5xl";
const subHeadingTw = "font-bold text-xl md:text-2xl lg:text-3xl";
</script>

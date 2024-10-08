<template>
  <div class="flex justify-center">
    <IconCard class="justify-self-center w-full lg:w-4/5">
      <template #title> How to use Disco? </template>

      <div class="mb-4">
        <b>Step 1: Select a <DISCOllaborative /></b><br>
        Choose different tasks and datasets for training, ranging from tabular data to images, and from binary classification to class-wise prediction. Or you can define your own task.
      </div>

      <div class="mb-4">
        <b>Step 2: Select data for the training process</b><br>
        Connect your local data files to use during the training process. Those files will not be uploaded anywhere.
      </div>

      <div class="mb-4">
        <b>Step 3: Neural network training</b><br>
        Choose between training alone and training collaboratively. Local training will fine tune the model with your local data and the resulting model will only be available to your device. Training collaboratively will allow model communication between local devices during training. Your local model updates (and not the data) are aggregated into an improved shared model. After completing training, you can find training statistics on the model accuracy in the dashboard. For training collaboratively, details on the communication rounds will also appear on the board.
      </div>

      <div class="mb-4">
        <b>Step 4: Save the model</b><br>
        You can choose to save the model to reuse later.
      </div>

      <div class="mb-4">
        <b>Step 5: Reuse the model</b><br>
        Come back any time to reuse your local model: resume training or run inference on new data.
      </div>

      <div class="flex flex-wrap items-center justify-center space-x-8">
        <CustomButton @click="router.push('/list')" class="mb-2">
          <!-- Not using <DISCOllaboratives/> because of the cyan background -->
          explore DISCOllaboratives
        </CustomButton>
        <CustomButton @click="router.push('/create')" class="mb-2">
          create your own task
        </CustomButton>
      </div>
    </IconCard>
  </div>
</template>

<script lang="ts" setup>
import { onActivated } from 'vue'
import { useRouter } from 'vue-router'

import { useInformationStore } from "@/store";
import IconCard from '@/components/containers/IconCard.vue'
import CustomButton from '@/components/simple/CustomButton.vue'
import DISCOllaborative from '@/components/simple/DISCOllaborative.vue'

const router = useRouter()
const informationStore = useInformationStore()
onActivated(() => { informationStore.step = 2 })
</script>

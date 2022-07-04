<template>
  <div>
    <!-- Disco logo -->
    <DiscoGIF class="mx-auto mb-[10%]" />

    <!-- Main cards -->
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-3 items-stretch">
      <!-- List of tasks -->
      <ButtonCard
        :click="goToTaskList"
      >
        <template #title>
          Build AI with collaborators <span class="underline">without sharing any data</span>
        </template>
        <template #text>
          <p>- Exchange <span class="italic">models</span> not data</p>
          <p>- Keep data at its source</p>
          <p>- Choose either <span class="italic">decentralized</span> or <span class="italic">federated</span> training</p>
        </template>
        <template #button>
          Start training
        </template>
      </ButtonCard>
      <!-- Task creation -->
      <ButtonCard :click="goToNewTaskCreationForm">
        <template #title>
          Create your <span class="underline">own task</span>
        </template>
        <template #text>
          <p>- Provide a model architecture</p>
          <p>- Describe the task</p>
          <p>- Specify the desired training and evaluation parameters</p>
        </template>
        <template #button>
          Create new task
        </template>
      </ButtonCard>
      <!-- Model testing -->
      <ButtonCard :click="goToModelTesting">
        <template #title>
          Test your models
        </template>
        <template #text>
          <p>- Choose a trained model</p>
          <p>- Provide a test dataset</p>
          <p>- Assess your model's performance</p>
        </template>
        <template #button>
          Test Your Models
        </template>
      </ButtonCard>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import DiscoGIF from '@/assets/gif/DiscoGIF.vue'
import ButtonCard from '@/components/containers/ButtonCard.vue'

export default defineComponent({
  name: 'Home',
  components: {
    ButtonCard,
    DiscoGIF
  },
  methods: {
    goToTaskList () {
      this.$router.push({ path: '/list' })
    },
    goToNewTaskCreationForm () {
      this.$router.push({ path: '/create' })
    },
    goToModelTesting () {
      this.$router.push({ path: '/testing' })
    }
  }
})
</script>

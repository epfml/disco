<template>
  <div class="grid grid-cols-1 gap-8 md:mx-20 lg:gap-16 lg:grid-cols-3 items-stretch">
    <!-- List of tasks -->
    <ButtonCard
      :click="goToTaskList"
      title-placement="center"
    >
      <template #title>
        Join a <span title="A group of (DIS)tributed users with similar data, (CO)llaborating to train a model"><span
          class="font-disco text-disco-cyan"
        >DISCO</span>llaborative</span> to train an existing model
      </template>
      <template #button>
        Train
      </template>
    </ButtonCard>
    <!-- Model testing -->
    <ButtonCard
      :click="goToModelTesting"
      title-placement="center"
    >
      <template #title>
        Validate a <span class="font-disco text-disco-cyan">DISCO</span>-trained model
      </template>
      <template #button>
        Test
      </template>
    </ButtonCard>
    <!-- Task creation -->
    <ButtonCard
      :click="goToNewTaskCreationForm"
      title-placement="center"
    >
      <template #title>
        Add your own model to be trained in a <span title="A group of (DIS)tributed users with similar data, (CO)llaborating to train a model"><span
          class="font-disco text-disco-cyan"
        >DISCO</span>llaborative</span>
      </template>
      <template #button>
        Create
      </template>
    </ButtonCard>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

import ButtonCard from '@/components/containers/ButtonCard.vue'

export default defineComponent({
  name: 'GetStarted',
  components: {
    ButtonCard
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

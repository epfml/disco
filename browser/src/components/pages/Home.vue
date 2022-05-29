<template>
  <div>
    <!-- Welcoming words -->
    <Disco class="mx-auto mb-[5%]" />
    <!-- TODO: This section is not algined with the top, not sure why -->
    <div class="grid grid-cols-2 gap-8 items-stretch">
      <TitleCard
        :title="'Build AI with collaborators but'"
        :title-underlined="'without sharing any data'"
      >
        <div class="py-6">
          <p>- Exchange <span class="italic">models</span> not data</p>
          <p>- Keep data at its source</p>
          <p>- Choose either <span class="italic">decentralized</span> or <span class="italic">federated</span> training</p>
        </div>
        <div class="text-center pt-3">
          <CustomButton @click="goToTaskList()">
            Start Building
          </CustomButton>
        </div>
      </TitleCard>
      <TitleCard
        :title="'Create your'"
        :title-underlined="'own task'"
      >
        <div class="py-6">
          <p>- Choose a model</p>
          <p>- Describe the task</p>
          <p>- Specify the desired training and evaluation parameters</p>
        </div>
        <div class="text-center pt-3">
          <CustomButton @click="goToNewTaskCreationForm()">
            Create New Task
          </CustomButton>
        </div>
      </TitleCard>
    </div>
  </div>
</template>

<script lang="ts">
import TitleCard from '@/components/containers/TitleCard.vue'
import CustomButton from '@/components/simple/CustomButton.vue'
import Disco from '@/assets/svg/Disco.vue'

export default {
  name: 'Home',
  components: {
    TitleCard,
    CustomButton,
    Disco
  },
  methods: {
    goToTaskList () {
      this.$router.push({ path: '/list' })
    },
    goToNewTaskCreationForm () {
      this.$router.push({ path: '/create' })
    }
  }
}
</script>

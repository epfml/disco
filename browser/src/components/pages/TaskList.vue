<template>
  <div class="grid grid-cols-1 gap-8 mt-8">
    <div
      v-for="[taskID, task] in tasks"
      :key="taskID"
    >
      <ButtonCard
        :click="() => goToSelection(taskID)"
        :button-placement="'left'"
      >
        <template #title>
          {{ task.displayInformation.taskTitle }}
        </template>
        <template #text>
          <div v-html="task.displayInformation.summary" />
        </template>
        <template #button>
          Join
        </template>
      </ButtonCard>
    </div>
  </div>
</template>

<script lang="ts">
import ButtonCard from '@/components/containers/ButtonCard.vue'

import { mapState } from 'vuex'

export default {
  name: 'TaskList',
  components: {
    ButtonCard
  },
  computed: {
    ...mapState(['tasks'])
  },
  methods: {
    goToSelection (taskID: string) {
      this.$router.push({ path: `/${taskID}` })
    }
  }
}
</script>

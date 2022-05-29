<template>
  <div class="grid grid-cols-1 gap-8">
    <div
      v-for="[taskID, task] in tasks"
      :key="taskID"
      class="group"
    >
      <TitleCard :title="task.displayInformation.taskTitle">
        <ul class="text-base ont-semibold text-slate-500 dark:text-light py-3">
          <span v-html="task.displayInformation.summary" />
        </ul>
        <div class="pt-2">
          <CustomButton
            @click="goToSelection(taskID)"
          >
            Join
          </CustomButton>
        </div>
      </TitleCard>
    </div>
  </div>
</template>

<script lang="ts">
import TitleCard from '@/components/containers/TitleCard.vue'
import CustomButton from '@/components/simple/CustomButton.vue'

import { mapState } from 'vuex'

export default {
  name: 'TaskList',
  components: {
    TitleCard,
    CustomButton
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

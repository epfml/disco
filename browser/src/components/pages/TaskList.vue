<template>
  <div class="grid grid-cols-1 gap-8 mt-8">
    <div
      v-for="[taskID, task] in tasks"
      :key="taskID"
    >
      <TitleCard
        class="
          transition
          duration-200
          hover:-translate-y-1 hover:scale-[101%]
          hover:outline hover:outline-2 hover:outline-disco-cyan"
        :title="task.displayInformation.taskTitle"
      >
        <ul class="text-base ont-semibold text-slate-500 py-3">
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

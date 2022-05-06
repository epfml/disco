<template>
  <BaseLayout>
    <ProgressBar
      class="mb-5"
      :blocked="true"
      :blocked-step="0"
    />
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-1 xl:grid-cols-1">
      <div
        v-for="task in tasks"
        :key="task.taskID"
        class="group"
      >
        <TitleCard :title="task.displayInformation.taskTitle">
          <ul class="text-base ont-semibold text-slate-500 dark:text-light">
            <span v-html="task.displayInformation.summary" />
          </ul>
          <div class="pt-3">
            <CustomButton
              @click="goToSelection(task.taskID)"
            >
              Join
            </CustomButton>
          </div>
        </TitleCard>
      </div>
    </div>
  </BaseLayout>
</template>

<script lang="ts">
import BaseLayout from '@/components/containers/BaseLayout.vue'
import ProgressBar from '@/components/navigation/ProgressBar.vue'
import TitleCard from '@/components/containers/TitleCard.vue'
import CustomButton from '@/components/simple/CustomButton.vue'

export default {
  name: 'TaskList',
  components: {
    BaseLayout,
    TitleCard,
    CustomButton,
    ProgressBar
  },
  props: {
    tasks: {
      // Array<Task>() constructor would be preferable but is forbidden by ESLint
      type: Object,
      default: undefined
    }
  },
  methods: {
    goToSelection (taskID: string) {
      this.$router.push({ path: `/${taskID}` })
    }
  }
}
</script>

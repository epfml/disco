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
      >
        <Card>
          <div>
            <h6
              class="
              text-xl
              font-medium
              leading-none
              tracking-wider
              group-hover:text-disco-cyan
            "
            >
              {{ task.displayInformation.taskTitle }}
            </h6>
          </div>
          <div class="ml-10">
            <ul class="text-base ont-semibold text-slate-500 dark:text-light">
              <span v-html="task.displayInformation.summary" />
            </ul>
          </div>
          <CustomButton
            class="mt-4"
            @click="goToSelection(task.taskID)"
          >
            Join
          </CustomButton>
        </Card>
      </div>
    </div>
  </BaseLayout>
</template>

<script lang="ts">
import BaseLayout from '@/components/containers/BaseLayout.vue'
import ProgressBar from '@/components/navigation/ProgressBar.vue'
import Card from '@/components/containers/Card.vue'
import CustomButton from '@/components/simple/CustomButton.vue'

export default {
  name: 'TaskList',
  components: {
    BaseLayout,
    Card,
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

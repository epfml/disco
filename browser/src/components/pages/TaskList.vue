<template>
  <BaseLayout>
    <div class="grid grid-cols-1 gap-8">
      <div
        v-for="task in tasks"
        :key="task.taskID"
        class="group"
      >
        <TitleCard :title="task.displayInformation.taskTitle">
          <ul class="text-base ont-semibold text-slate-500 dark:text-light py-3">
            <span v-html="task.displayInformation.summary" />
          </ul>
          <div class="pt-2">
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
import { Set } from 'immutable'
import { Task } from 'discojs'

import BaseLayout from '@/components/containers/BaseLayout.vue'
import TitleCard from '@/components/containers/TitleCard.vue'
import CustomButton from '@/components/simple/CustomButton.vue'
import { loadTasks } from '@/tasks'

export default {
  name: 'TaskList',
  components: {
    BaseLayout,
    TitleCard,
    CustomButton
  },
  async beforeRouteEnter (to, from, next) {
    const tasks: Set<Task> = await loadTasks()
    next(vm => vm.setTasks(tasks))
  },
  emits: ['next-step'],
  data () {
    return {
      tasks: undefined
    }
  },
  methods: {
    setTasks (tasks: Task[]) {
      this.tasks = tasks
    },
    goToSelection (taskID: string) {
      this.$router.push({ path: `/${taskID}` })
      this.$emit('next-step')
    }
  }
}
</script>

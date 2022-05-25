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

import { isTask } from 'discojs'

import BaseLayout from '@/components/containers/BaseLayout.vue'
import TitleCard from '@/components/containers/TitleCard.vue'
import CustomButton from '@/components/simple/CustomButton.vue'

export default {
  name: 'TaskList',
  components: {
    BaseLayout,
    TitleCard,
    CustomButton
  },
  props: {
    tasks: {
      validator: (obj) => Set.isSet(obj) && obj.every(isTask),
      default: Set()
    }
  },
  emits: ['next-step'],
  methods: {
    goToSelection (taskID: string) {
      this.$router.push({ path: `/${taskID}` })
      this.$emit('next-step')
    }
  }
}
</script>

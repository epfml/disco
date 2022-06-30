<template>
  <div class="space-y-8 pt-8">
    <div class="flex flex-row gap-8">
      <ToggleButton
        v-for="(filter, idx) in filters"
        :key="idx"
        @click="toggle(filter)"
      >
        {{ filter.name }}
      </ToggleButton>
    </div>
    <div class="flex flex-col gap-8 mt-8">
      <div
        v-for="task in filteredTasks"
        :key="task.taskID"
      >
        <ButtonCard
          :click="() => goToSelection(task.taskID)"
          button-placement="left"
        >
          <template
            #title
          >
            {{ task.displayInformation.taskTitle }} - {{ task.trainingInformation.scheme }}
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
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapState } from 'vuex'

import { Task } from 'discojs'

import ButtonCard from '@/components/containers/ButtonCard.vue'
import ToggleButton from '@/components/simple/ToggleButton.vue'

class Filter {
  public active: boolean

  constructor (
    public readonly name: string,
    public readonly apply: (task: Task) => boolean
  ) {
    this.active = false
  }
}

export default defineComponent({
  name: 'TaskList',
  components: {
    ButtonCard,
    ToggleButton
  },
  data (): { filters: Filter[] } {
    return {
      filters: ['Decentralized', 'Federated']
        .map((scheme: string) =>
          new Filter(scheme, (task: Task) =>
            task.trainingInformation.scheme === scheme))
    }
  },
  computed: {
    ...mapState(['tasks']),
    filteredTasks (): Task[] {
      return (Array.from(this.tasks.values()) as Task[])
        .filter((task: Task) =>
          this.filters.every((filter: Filter) =>
            filter.active ? filter.apply(task) : true))
    }
  },
  methods: {
    goToSelection (taskID: string): void {
      this.$router.push({ path: `/${taskID}` })
    },
    toggle (filter: Filter): void {
      filter.active = !filter.active
    }
  }
})
</script>

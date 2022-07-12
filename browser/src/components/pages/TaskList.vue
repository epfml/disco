<template>
  <div class="space-y-8 pt-8">
    <h1 class="font-disco text-3xl text-center text-disco-cyan">
      Filters
    </h1>
    <div
      v-show="tasks.size > 0"
      class="flex flex-wrap gap-8"
    >
      <div
        v-for="(filter, idx) in filters"
        :key="offset + idx"
        class="text-center"
      >
        <ToggleButton @click="toggle(filter)">
          {{ filter.name }}
        </ToggleButton>
      </div>
    </div>
    <h1 class="font-disco text-3xl text-center text-disco-cyan">
      Tasks
    </h1>
    <div class="flex flex-col gap-8 mt-8">
      <ButtonCard
        v-show="filteredTasks.length === 0 && tasks.size > 0"
        class="mx-auto"
        :click="clearFilters"
      >
        <template #title>
          No task corresponds to the selected filters
        </template>
        <template #text>
          Please press the button below to clear selected filters.
        </template>
        <template #button>
          Clear filters
        </template>
      </ButtonCard>
      <ButtonCard
        v-show="tasks.size === 0"
        class="mx-auto"
        :click="reloadPage"
      >
        <template #title>
          No task fetched from server
        </template>
        <template #text>
          Please press the button below to reload the app. Please ensure the Disco server is up and running.
        </template>
        <template #button>
          Reload page
        </template>
      </ButtonCard>
      <div
        v-for="task in filteredTasks"
        v-show="filteredTasks.length > 0"
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
  data (): { filters: Filter[], offset: number } {
    return {
      filters: ['Decentralized', 'Federated']
        .map((scheme: string) =>
          new Filter(scheme, (task: Task) =>
            task.trainingInformation.scheme === scheme)),
      offset: 0
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
    },
    clearFilters (): void {
      this.filters.forEach((filter: Filter) => { filter.active = false })
      // little trick to reset filters
      this.offset = this.offset === 0 ? this.filters.length : 0
    },
    reloadPage (): void {
      this.$router.go()
    }
  }
})
</script>

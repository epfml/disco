<template>
  <div class="space-y-8 pt-8">
    <div
      v-show="tasks.size > 0"
      class="flex flex-wrap"
    >
      <IconCard class="grow min-w-60">
        <template #title>
          Training Scheme
        </template>
        <template #content>
          <div
            class="flex flex-wrap gap-8"
          >
            <div
              v-for="(filter, idx) in schemeFilters"
              :key="offset + idx"
              class="text-center"
            >
              <CheckBox @clicked="toggle(filter)">
                {{ filter.name }}
              </CheckBox>
            </div>
          </div>
        </template>
      </IconCard>
      <IconCard class="grow min-w-60">
        <template #title>
          Data Type
        </template>
        <template #content>
          <div
            class="flex flex-wrap gap-8"
          >
            <div
              v-for="(filter, idx) in dataFilters"
              :key="offset + idx"
              class="text-center"
            >
              <CheckBox @clicked="toggle(filter)">
                {{ filter.name }}
              </CheckBox>
            </div>
          </div>
        </template>
      </IconCard>
    </div>
    <h1 class="text-3xl text-slate-600 text-center">
      <span class="font-disco text-disco-cyan">DIS</span><span class="font-disco text-disco-blue">CO</span>llaboratives
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
            <div v-html="task.displayInformation.summary.preview" />
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

import IconCard from '@/components/containers/IconCard.vue'
import ButtonCard from '@/components/containers/ButtonCard.vue'
import CheckBox from '@/components/simple/CheckBox.vue'

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
    IconCard,
    ButtonCard,
    CheckBox
  },
  data (): { schemeFilters: Filter[], dataFilters: Filter[], offset: number } {
    return {
      schemeFilters: ['Decentralized', 'Federated']
        .map((scheme: string) =>
          new Filter(scheme, (task: Task) =>
            task.trainingInformation.scheme === scheme)),
      dataFilters: ['image', 'tabular']
        .map((dataType: string) =>
          new Filter(dataType, (task: Task) =>
            task.trainingInformation.dataType === dataType)),
      offset: 0
    }
  },
  computed: {
    ...mapState(['tasks']),
    filteredTasks (): Task[] {
      return ([...this.tasks.values()] as Task[])
        .filter((task: Task) =>
          this.schemeFilters.every((filter: Filter) =>
            filter.active ? filter.apply(task) : true) &&
          this.dataFilters.every((filter: Filter) =>
            filter.active ? filter.apply(task) : true)
        )
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
      this.schemeFilters.forEach((filter: Filter) => { filter.active = false })
      this.dataFilters.forEach((filter: Filter) => { filter.active = false })
      // little trick to reset the affiliated checkboxes
      this.offset = this.offset === 0 ? this.filters.length : 0
    },
    reloadPage (): void {
      this.$router.go()
    }
  }
})
</script>

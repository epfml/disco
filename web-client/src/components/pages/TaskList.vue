<template>
  <div class="space-y-8 pt-8">
    <div
      v-show="tasks.size > 0"
      class="flex flex-wrap gap-8"
    >
      <IconCard class="grow shrink-0 basis-48">
        <template #title>
          Filter by Training Scheme
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
      <IconCard class="grow shrink-0 basis-48">
        <template #title>
          Filter by Data Type
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
        :click="() => { router.go(0) }"
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
        id="tasks"
        class="contents"
      >
        <div
          v-for="task in filteredTasks"
          v-show="filteredTasks.length > 0"
          :id="task.taskID"
          :key="task.taskID"
        >
          <ButtonCard
            :click="() => router.push(`/${task.taskID}`)"
            button-placement="left"
          >
            <template
              #title
            >
              {{ task.displayInformation.taskTitle }} - {{ task.trainingInformation.scheme }}
            </template>
            <template #text>
              <div
                v-if="task.displayInformation.summary?.preview !== undefined"
                v-html="task.displayInformation.summary.preview"
              />
              <span
                v-else
                class="italic"
              >
                No description was provided by the task's author.
              </span>
            </template>
            <template #button>
              Join
            </template>
          </ButtonCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import { Task } from '@epfml/discojs'

import { useTasksStore } from '@/store/tasks'
import IconCard from '@/components/containers/IconCard.vue'
import ButtonCard from '@/components/containers/ButtonCard.vue'
import CheckBox from '@/components/simple/CheckBox.vue'

abstract class Filter {
  public active: boolean
  constructor (
    public readonly name: string,
    public readonly apply: (task: Task) => boolean
  ) {
    this.active = false
  }
}
class SchemeFilter extends Filter {
  constructor (name: string) {
    const apply = (task: Task) => task.trainingInformation.scheme === name
    super(name, apply)
  }
}
class DataFilter extends Filter {
  constructor (name: string) {
    const apply = (task: Task) => task.trainingInformation.dataType === name
    super(name, apply)
  }
}

const router = useRouter()
const { tasks } = storeToRefs(useTasksStore())

const schemeFilters = reactive(['Decentralized', 'Federated']
  .map((scheme: string) => new SchemeFilter(scheme)))
const dataFilters = reactive(['image', 'tabular']
  .map((dataType: string) => new DataFilter(dataType)))

const offset = ref(0)

const filters = computed(() => schemeFilters.concat(dataFilters))
const filteredTasks = computed(() => {
  return ([...tasks.value.values()] as Task[])
    .filter((task: Task) =>
      filters.value.every((filter: Filter) =>
        filter.active ? filter.apply(task) : true)
    )
})

function toggle (filter: Filter): void {
  filter.active = !filter.active
}
function clearFilters (): void {
  filters.value.forEach((filter: Filter) => { filter.active = false })
  // little trick to reset the affiliated checkboxes
  offset.value = offset.value === 0 ? filters.value.length : 0
}

</script>

<template>
  <div class="space-y-4 md:space-y-8">
    <IconCard>
      <template #title>
        The Task
      </template>
      <template #icon>
        <Tasks />
      </template>
      <template
        v-if="overviewText !== undefined"
        #content
      >
        <div v-html="overviewText" />
      </template>
      <template
        v-else
        #content
      >
        <span class="italic">
          No task description was provided by the task's author.
        </span>
      </template>
    </IconCard>

    <IconCard v-if="task.displayInformation.model !== undefined">
      <template #title>
        The Model
      </template>
      <template #icon>
        <Model />
      </template>
      <template #content>
        <div v-html="task.displayInformation.model" />
      </template>
    </IconCard>
    <DropdownCard>
      <template #title>
        Training Parameters
      </template>
      <template #content>
        <div
          v-for="section in [trainingInformation, privacyParameters, modelCompileData]"
          :key="section.id"
        >
          <span class="text-slate-600 font-bold text-left">
            {{ section.title }}
          </span>
          <div
            v-for="field in section.fields"
            :key="field.id"
          >
            <div
              v-if="field.id in task.trainingInformation ||
                field.id in task.trainingInformation.modelCompileData ||
                displayField(section, field)"
              class="grid grid-cols-3 gap-4"
            >
              <span>{{ field.name }}</span>
              <div class="col-span-2">
                <span v-if="['trainingInformation', 'privacyParameters'].includes(section.id)">
                  {{ prettifyField(field, task.trainingInformation) }}
                </span>
                <div v-else-if="section.id === 'modelCompileData'">
                  <span>{{ prettifyField(field, task.trainingInformation.modelCompileData, true) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </DropdownCard>
    <ModelCaching
      :task="task"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, defineProps } from 'vue'

import { Task } from '@epfml/discojs'

import { trainingInformation, privacyParameters, modelCompileData, FormField, FormSection } from '@/task_creation_form'
import ModelCaching from './ModelCaching.vue'
import IconCard from '@/components/containers/IconCard.vue'
import DropdownCard from '@/components/containers/DropdownCard.vue'

interface Props {
  task: Task
}
const props = defineProps<Props>()

// filter the fields we do not wish to display
trainingInformation.fields = trainingInformation.fields.filter((field) => field.id !== 'modelID')

const overviewText = computed(() => {
  if (props.task.displayInformation.summary === undefined) {
    return undefined
  }
  return Object.values(props.task.displayInformation.summary).join('<br><br>')
})

const prettifyField = (field: FormField, from: any, camelCase: boolean = false): string => {
  const obj = from[field.id]
  const strCase = camelCase ? camelToTitleCase : titleCase
  switch (typeof obj) {
    case 'undefined':
      return 'Unused'
    case 'string':
      return strCase(obj)
    case 'boolean':
      return obj ? 'Yes' : 'No'
    case 'object':
      if ('length' in obj) {
        return obj.length > 1
          ? obj.reduce((a, b) => strCase(String(a)) + ', ' + strCase(String(b)))
          : strCase(String(obj[0]))
      }
  }
  return obj
}

const titleCase = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1)

const camelToTitleCase = (camelCase: string): string =>
  titleCase(camelCase.replace(/([A-Z][aA-zZ])/g, ' $1'))

const displayField = (section: FormSection, field: FormField): boolean => {
  if (section.id === 'privacyParameters') {
    if (field.dependencies === undefined) {
      return true
    }
    for (const key of Object.keys(field.dependencies)) {
      if (props.task.trainingInformation[key] !== field.dependencies[key]) {
        return false
      }
    }
    return true
  }
  return false
}
</script>

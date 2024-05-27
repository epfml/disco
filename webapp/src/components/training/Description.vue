<template>
  <div class="space-y-4 md:space-y-8">
    <div class="flex justify-center">
    <IconCard 
      title-placement="left"
      v-if="isBrowserUnsupported">
      <template #title>Browser Unsupported</template>
       <template #icon>
        <Tasks />
      </template>
      <template #content>
        Unfortunately, this task is currently not available on your browser. Please try using a different one.
      </template>
    </IconCard>
    </div>
    <IconCard>
      <template #title>
        {{ props.task.displayInformation.taskTitle }}
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
          v-for="section in [trainingInformation, privacyParameters]"
          :key="section.id"
          class="py-4 first:py-0 last:py-0"
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
                displayField(section, field)
              "
              class="grid grid-cols-3 gap-4"
            >
              <span>{{ field.description ?? field.name }}</span>
              <div class="col-span-2">
                <span>
                  {{ prettifyField(field, task.trainingInformation, false) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </DropdownCard>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import type { Task } from '@epfml/discojs'

import type { FormDependency, FormField, FormSection } from '@/task_creation_form'
import { trainingInformation, privacyParameters } from '@/task_creation_form'
import IconCard from '@/components/containers/IconCard.vue'
import DropdownCard from '@/components/containers/DropdownCard.vue'
import Tasks from '@/assets/svg/Tasks.vue'
import Model from '@/assets/svg/Model.vue'

interface Props {
  task: Task
}
const props = defineProps<Props>()

const isBrowserUnsupported = computed(() => {
  return props.task.id =='wikitext-103' && navigator.userAgent.indexOf("Firefox") != -1
})
// filter the fields we do not wish to display
trainingInformation.fields = trainingInformation.fields.filter((field) => field.id !== 'modelID')

const overviewText = computed(() => {
  if (props.task.displayInformation.summary === undefined) {
    return undefined
  }
  return Object.values(props.task.displayInformation.summary).join('<br><br>')
})

const prettifyField = (field: FormField, from: any, camelCase: boolean): string => {
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
      if (Array.isArray(obj)) {
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
    const deps = field.dependencies
    if (deps === undefined) {
      return true
    }
    const potentialDependencies: Array<keyof FormDependency> = ['dataType', 'scheme', 'decentralizedSecure']
    return potentialDependencies.every((key) => props.task.trainingInformation[key] !== deps[key])
  }
  return false
}
</script>

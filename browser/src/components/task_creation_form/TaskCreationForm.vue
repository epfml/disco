<template>
  <VeeForm
    v-slot="{ handleSubmit }"
    :validation-schema="schema"
  >
    <form @submit="handleSubmit($event, onSubmit)">
      <div class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1">
        <div
          v-for="section in sections"
          :key="section.id"
        >
          <IconCard>
            <template #title>
              {{ section.title }}
            </template>
            <template #content>
              <div class="space-y-4">
                <div
                  v-for="field in section.fields"
                  :key="field.id"
                >
                  <div v-if="display(field)">
                    <label
                      :for="field.id"
                      class="
                      inline
                      text-slate-600
                      font-bold
                      md:text-right
                      mb-1
                      md:mb-0
                      pr-4
                    "
                    >
                      {{ field.name }}
                    </label>
                    <ErrorMessage
                      class="text-red-600"
                      :name="field.id"
                    />
                    <SelectContainer
                      v-if="['select', 'select-multiple'].includes(field.type)"
                      :field="field"
                    />
                    <FileContainer
                      v-else-if="field.type === 'file'"
                      :field="field"
                    />
                    <ArrayContainer
                      v-else-if="field.type === 'array'"
                      :field="field"
                    />
                    <ObjectArrayContainer
                      v-else-if="field.type === 'arrayObject'"
                      :field="field"
                    />
                    <TextContainer
                      v-else-if="field.type === 'text'"
                      :field="field"
                    />
                    <CheckboxContainer
                      v-else-if="field.type === 'checkbox'"
                      :field="field"
                    />
                    <NumberContainer
                      v-else-if="field.type === 'number'"
                      :field="field"
                    />
                    <FloatContainer
                      v-else-if="field.type === 'float'"
                      :field="field"
                    />
                  </div>
                </div>
              </div>
            </template>
          </IconCard>
        </div>
        <div class="flex flex-wrap justify-center gap-8 my-2">
          <CustomButton
            type="submit"
            class="basis-48"
          >
            Submit
          </CustomButton>
          <CustomButton
            ref="resetButton"
            type="reset"
            class="basis-48"
          >
            Reset
          </CustomButton>
          <CustomButton
            id="reset-button"
            href=""
            class="basis-48"
          >
            Request Help on Slack
          </CustomButton>
        </div>
      </div>
    </form>
  </VeeForm>
</template>

<script lang="ts" setup>
import * as yup from 'yup'
import { ref } from 'vue'
import { List, Map } from 'immutable'
import { Form as VeeForm, ErrorMessage } from 'vee-validate'

import { sections, FormField } from '@/task_creation_form'
import { useToaster } from '@/composables/toaster'
import IconCard from '@/components/containers/IconCard.vue'
import SelectContainer from './containers/SelectContainer.vue'
import FileContainer from './containers/FileContainer.vue'
import ArrayContainer from './containers/ArrayContainer.vue'
import ObjectArrayContainer from './containers/ObjectArrayContainer.vue'
import TextContainer from './containers/TextContainer.vue'
import CheckboxContainer from './containers/CheckboxContainer.vue'
import NumberContainer from './containers/NumberContainer.vue'
import FloatContainer from './containers/FloatContainer.vue'
import CustomButton from '@/components/simple/CustomButton.vue'

const toaster = useToaster()

// access refs in another way?
const resetButton = ref<HTMLElement>(document.getElementById('resetButton'))

const schemaData =
  Map(
    List(Object.values(sections))
      .flatMap((section) => List(section.fields)
        .map((field) => [field.id, field.yup.label(field.name)] as [string, yup.AnySchema])
      ).values()
  ).toObject()
const schema = yup.object(schemaData)

// const resetForm = (): void => { resetButton.value?.click() }

const onSubmit = (values: any): void => {
  toaster.error('The creation of custom tasks is not available yet!')
  // resetForm()
}

const display = (field: FormField): boolean => true
</script>

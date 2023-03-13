<template>
  <VeeForm
    v-slot="{ handleSubmit }"
    :validation-schema="schema"
  >
    <form
      class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1"
      @submit="handleSubmit($event, onSubmit)"
    >
      <div
        v-for="section in sections"
        :key="section.id"
      >
        <IconCard>
          <template #title>
            {{ section.title }}
          </template>
          <template #content>
            <div class="space-y-10">
              <div
                v-for="field in section.fields"
                :key="field.id"
              >
                <div>
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
                    <span
                      v-if="field.description !== undefined"
                      v-html="field.description"
                    />
                    <span
                      v-else
                      v-html="field.name"
                    />
                  </label>
                  <ErrorMessage
                    class="text-red-600"
                    :name="field.id"
                  />

                  <SelectContainer
                    v-if="field.id === 'sourceType'"
                    v-model="sourceType"
                    :field="field"
                  />
                  <div
                    v-else-if="field.id === 'source'"
                    class="flex gap-4"
                  >
                    <TextContainer
                      v-model="source"
                      :field="field"
                    />
                    <CustomButton
                      :field="field"
                      :disabled="!sourceType || !source"
                      @click="async () => await loadFeatures()"
                    >
                      Load features
                    </CustomButton>
                  </div>
                  <div v-else>
                    <SelectContainer
                      v-if="['select', 'select-multiple'].includes(field.type)"
                      :field="field"
                    />
                    <FileContainer
                      v-else-if="field.type === 'file'"
                      :field="field"
                      :available="!modelURL"
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
            </div>
          </template>
        </IconCard>
      </div>
      <IconCard v-if="featuresFields">
        <template #title>
          Features
        </template>
        <template #content>
          <div class="space-y-10">
            <div
              v-for="feature, index in featuresFields"
              :key="index"
              class="flex gap-10"
            >
              <div
                v-for="field in feature"
                :key="field.id"
                :class="{ grow: field.id.includes('description') }"
              >
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
                  <span
                    v-if="field.description !== undefined"
                    v-html="field.description"
                  />
                  <span
                    v-else
                    v-html="field.name"
                  />
                </label>
                <ErrorMessage
                  class="text-red-600"
                  :name="field.id"
                />
                <TextContainer
                  v-if="field.type === 'text'"
                  :field="field"
                />
                <CheckboxContainer
                  v-else-if="field.type === 'checkbox'"
                  :field="field"
                />
              </div>
            </div>
          </div>
        </template>
      </IconCard>
      <div class="flex flex-wrap justify-center gap-8 my-2">
        <CustomButton
          type="submit"
          class="basis-48 h-16"
        >
          Submit
        </CustomButton>
        <CustomButton
          type="reset"
          class="basis-48"
        >
          Reset
        </CustomButton>
      </div>
    </form>
  </VeeForm>
</template>

<script lang="ts" setup>
import * as yup from 'yup'
import { ref } from 'vue'
import { List, Map } from 'immutable'
import { Form as VeeForm, ErrorMessage } from 'vee-validate'

import { data } from '@epfml/discojs'

import { FormField, DatasetInformation } from '@/creation_form'
import { useToaster } from '@/composables/toaster'
import { CONFIG } from '@/config'
import IconCard from '@/components/containers/IconCard.vue'
import SelectContainer from '../task_creation_form/containers/SelectContainer.vue'
import FileContainer from '../task_creation_form/containers/FileContainer.vue'
import ArrayContainer from '../task_creation_form/containers/ArrayContainer.vue'
import ObjectArrayContainer from '../task_creation_form/containers/ObjectArrayContainer.vue'
import TextContainer from '../task_creation_form/containers/TextContainer.vue'
import CheckboxContainer from '../task_creation_form/containers/CheckboxContainer.vue'
import NumberContainer from '../task_creation_form/containers/NumberContainer.vue'
import FloatContainer from '../task_creation_form/containers/FloatContainer.vue'
import CustomButton from '@/components/simple/CustomButton.vue'
import { pushDataset } from '@epfml/discojs/dist/core/dataset'

const toaster = useToaster()

const sections = [DatasetInformation]
// Maps sections to a form-wide yup schema object composed of labelled yup fields.
// A list of (K, V) pair tuples is converted to a K -> V map, which directly corresponds
// to a { K: V } JavaScript object, as required by yup.
const schemaData =
  Map(
    List(Object.values(sections))
      .flatMap((section) => List(section.fields)
        .map((field) =>
          [field.id, field.yup.label(field.name)] as [string, yup.AnySchema]))
      .values()
  ).toObject()
const schema = yup.object().shape(schemaData)

const source = ref('')
const sourceType = ref('')

const featuresFields = ref(null)

const onSubmit = async (rawDataset: any, { resetForm }): Promise<void> => {
  toaster.success('Form validation succeeded! Uploading...')

  try {
    await pushDataset(CONFIG.serverUrl, rawDataset)
  } catch (e) {
    toaster.error('An error occured server-side')
    console.error(e instanceof Error ? e.message : e.toString())
    return
  }
  toaster.success('Task successfully submitted')
  featuresFields.value = null
  resetForm()
}

async function loadFeatures () {
  try {
    const features = await data.fetchFeatures(CONFIG.serverUrl, source.value, sourceType.value)
    const fields: FormField[][] = features.map((name, index) => [
      {
        id: `features.${index}.name`,
        name: `Feature ${index} name`,
        yup: yup.string().required(),
        as: 'input',
        type: 'text',
        value: name
      },
      {
        id: `features.${index}.description`,
        name: `Feature ${index} description`,
        yup: yup.string().optional(),
        as: 'input',
        type: 'text'
      },
      {
        id: `features.${index}.allowFeature`,
        name: 'Use as feature',
        yup: yup.boolean().required(),
        as: 'input',
        type: 'checkbox',
        default: true
      },
      {
        id: `features.${index}.allowLabel`,
        name: 'Use as label',
        yup: yup.boolean().required(),
        as: 'input',
        type: 'checkbox',
        default: true
      }
    ])

    featuresFields.value = fields
  } catch (e) {
    toaster.error('URL invalid or file too heavy')
    console.error(e instanceof Error ? e.message : e.toString())
  }
}
</script>

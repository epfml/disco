<template>
  <VeeForm
    v-slot="{ handleSubmit }"
    :validation-schema="schema"
  >
    <form
      class="grid grid-cols-1 gap-8 lg:grid-cols-1 xl:grid-cols-1"
      @submit="handleSubmit($event, onSubmit)"
    >
      <div
        v-for="section in sections"
        :key="section.id"
      >
        <IconCard>
          <template #title> {{ section.title }} </template>

          <div class="space-y-10">
            <div
              v-for="field in section.fields"
              :key="field.id"
            >
              <div
                v-if="isFieldVisible(
                  field,
                  {
                    dataType,
                    scheme
                  }
                )"
              >
              <div class="flex">
                <label
                  :for="field.id"
                  class="
                    inline
                    text-slate-600
                    dark:text-slate-200
                    font-bold
                    md:text-right
                    mb-1
                    md:mb-0
                    pr-2
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
                <div v-if="field.type !== 'select' && field.type !== 'text'">
                <span
                  class="hover:cursor-pointer"
                  v-tippy="{
                    content: getContent(field),
                  }"
                >
                  <i class="fa fa-question mr-1" />
                </span>
                </div>
                <ErrorMessage
                  class="text-red-600 pl-2"
                  :name="field.id"
                />
                </div>
                <SelectContainer
                  v-if="field.id === 'dataType'"
                  v-model="dataType"
                  :field="field"
                />
                <SelectContainer
                  v-else-if="field.id === 'scheme'"
                  v-model="scheme"
                  :field="field"
                />
                <TextContainer
                  v-else-if="field.id === 'modelURL'"
                  v-model="modelURL"
                  :field="field"
                  :available="modelFiles.size === 0"
                />
                <div v-else>
                  <SelectContainer
                    v-if="['select', 'select-multiple'].includes(field.type)"
                    :field="field"
                  />
                  <FileContainer
                    v-else-if="field.type === 'file'"
                    :field="field"
                    :available="!modelURL"
                    @input="handleModelFiles($event)"
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
        </IconCard>
      </div>
      <IconCard>
        <template #title> How to join after ?</template>
        <div>
            After submitting the form, others will be able to join the task from the
            <span @click="goToDiscollaborative()" class="underline text-blue-400 cursor-pointer"><DISCOllaboratives /> page</span>. You can find more explanations about
            <DISCO /> in the <span @click="goToInformation()" class="underline text-blue-400 cursor-pointer">Information page</span>.
        </div>
      </IconCard>
      <div class="flex flex-wrap justify-center gap-8 my-2">
        <CustomButton
          type="submit"
          class="basis-48"
        >
          submit
        </CustomButton>
        <CustomButton
          type="reset"
          class="basis-48"
        >
          reset
        </CustomButton>
      </div>
    </form>
  </VeeForm>
</template>

<script lang="ts" setup>
import createDebug from "debug";
import * as yup from 'yup'
import { ref, shallowRef } from 'vue'
import { Form as VeeForm, ErrorMessage } from 'vee-validate'

import { List, Map } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { DataType, Task } from "@epfml/discojs";
import { models, pushTask } from '@epfml/discojs'

import type { FormDependency, FormField, FormSection } from '@/task_creation_form'
import { sections, privacyParameters } from '@/task_creation_form'
import { useToaster } from '@/composables/toaster'
import { CONFIG } from '@/config'
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
import { useRouter } from "vue-router";
import DISCO from "@/components/simple/DISCO.vue";
import DISCOllaboratives from "@/components/simple/DISCOllaboratives.vue";

const router = useRouter()

const debug = createDebug("webapp:TaskForm");
const toaster = useToaster()

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
const schema = yup.object().shape(schemaData, [['modelURL', 'weightsFile'], ['modelURL', 'modelFile']])

const dataType = ref('')
const scheme = ref('')
const modelURL = ref('')
const modelFiles = shallowRef(List<File>())


const formatSection = (section: FormSection, rawTask: any): any => {
  let fields = List(section.fields)
    .map((field) => {
      const content = rawTask[field.id]
      if (content === undefined) {
        return undefined
      }
      if (['number', 'float'].includes(field.type)) {
        return [field.id, Number(content)]
      }
      if (field.type === 'checkbox') {
        return [field.id, Boolean(content)]
      }
      return [field.id, content]
    })
    .filter((entry) => entry !== undefined)

  // nest special sections into training information
  if (section.id === 'trainingInformation') {
    fields = fields
      .push(
        formatSection(
          privacyParameters,
          rawTask
        )
      )
      // basically generalInformation, with the exception of taskID
      .push([
        'scheme',
        rawTask.scheme
      ])
      .push([
        'dataType',
        rawTask.dataType
      ])
  }

  return [section.id, Map(fields).toObject()]
}

const handleModelFiles = async (files: FileList): Promise<void> => {
  modelFiles.value = modelFiles.value.push(...files)
}

const onSubmit = async (rawTask: any): Promise<void> => {
  toaster.success('Form validation succeeded! Uploading...')

  // format the flat form entries to a nested task object
  const specialSections = [
    'generalInformation', 'privacyParamters', 'modelFiles'
  ]
  const task = Map(
    List(sections)
      .filter((section) => !specialSections.includes(section.id))
      .map((section) => formatSection(section, rawTask))
  )
    .set('id', rawTask.taskID)
    .toObject() as unknown as Task<DataType>

  let model
  try {
    model = new models.TFJS(
      task.trainingInformation.dataType,
      await tf.loadLayersModel(tf.io.browserFiles(modelFiles.value.toArray())),
    );
  } catch (e) {
    debug("while loading model:%o", e);
    toaster.error('Model loading failed');
    return
  }

  try {
    await pushTask(CONFIG.serverUrl, task, model)
  } catch (e) {
    toaster.error('An error occured server-side')
    debug("while pushing task to server: %o", e);
    return
  }
  toaster.success('Task successfully submitted')
}

const isFieldVisible = (
  field: FormField,
  dependencies: Record<string, unknown>
): boolean => {
  const fieldDeps = field.dependencies
  if (fieldDeps === undefined) {
    return true
  }
  const potentialDependencies: Array<keyof FormDependency> = ['dataType', 'scheme']
  return potentialDependencies.every((key) => fieldDeps[key] !== dependencies[key])
}

const getContent = (field: FormField): string => {
  return "Expected type : " + field.type
}

function goToInformation () {
  const scrollableDiv = document.getElementById('scrollable-div');
  if (scrollableDiv !== null) {
    scrollableDiv.scrollTo(0, 0) // doesn't work with behavior: 'smooth'
  }
  router.push({ path: '/information' })
}

function goToDiscollaborative () {
  const scrollableDiv = document.getElementById('scrollable-div');
  if (scrollableDiv !== null) {
    scrollableDiv.scrollTo(0, 0) // doesn't work with behavior: 'smooth'
  }
  router.push({ path: '/list' })
}
</script>

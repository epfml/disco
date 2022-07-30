<template>
  <!-- Form definition -->
  <VeeForm
    v-slot="{ errors, handleSubmit }"
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
                  v-for="field in allFields(section)"
                  :key="field.id"
                >
                  <label
                    class="
                      inline
                      text-slate-600
                      font-bold
                      md:text-right
                      mb-1
                      md:mb-0
                      pr-4
                    "
                    :for="field.id"
                  >
                    {{ field.name }}
                  </label>
                  <VeeField
                    v-if="field.type == 'select' && field.id == 'dataType'"
                    :id="field.id"
                    v-slot="{ value }"
                    v-model="dataType"
                    :as="field.type"
                    :name="field.id"
                    class="
                      bg-transparent
                      border-b
                      m-auto
                      block
                      focus:outline-none focus:border-green-500
                      w-full
                      mb-6
                      text-gray-700
                      pb-1
                    "
                  >
                    <option
                      v-for="option in field.options"
                      :key="option"
                      :value="option"
                      :selected="value && (value as any).includes(option)"
                    >
                      {{ option }}
                    </option>
                  </VeeField>

                  <VeeField
                    v-else-if="field.type == 'select' && field.id != 'dataType'"
                    :id="field.id"
                    v-slot="{ value }"
                    :as="field.type"
                    :name="field.id"
                    class="
                      bg-transparent
                      border-b
                      m-auto
                      block
                      focus:outline-none focus:border-green-500
                      w-full
                      mb-6
                      text-slate-700
                      pb-1
                    "
                  >
                    <option
                      v-for="option in field.options"
                      :key="option"
                      :value="option"
                      :selected="value && (value as any).includes(option)"
                    >
                      {{ option }}
                    </option>
                  </VeeField>

                  <VeeField
                    v-else-if="field.type == 'select-multiple'"
                    :id="field.id"
                    v-slot="{ value }"
                    as="select"
                    :name="field.id"
                    class="
                      bg-transparent
                      border-b
                      m-auto
                      block
                      focus:outline-none focus:border-green-500
                      w-full
                      mb-6
                      text-slate-700
                      pb-1
                    "
                    multiple
                  >
                    <option
                      v-for="option in field.options"
                      :key="option"
                      :value="option"
                      :selected="value && (value as any).includes(option)"
                    >
                      {{ option }}
                    </option>
                  </VeeField>

                  <!-- select file button -->
                  <div v-else-if="field.type == 'file'">
                    <div class="h-72">
                      <div
                        class="
                          relative
                          h-full
                          hover:cursor-pointer
                          border-dashed border-2 border-gray-500
                          dark:border-primary
                          flex flex-col
                          justify-center
                          items-center
                        "
                      >
                        <div class="absolute">
                          <div class="flex flex-col items-center">
                            <svg
                              class="w-8 h-8"
                              fill="currentColor"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                            >
                              <path
                                d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z"
                              /></svg><span class="block text-gray-400 font-normal">Drag and drop your file anywhere or</span>
                            <span class="block text-gray-400 font-normal">or</span>
                            <span
                              class="
                                block
                                font-normal
                                mt-2
                                p-2
                                rounded-sm
                                text-slate-700
                                transition-colors
                                duration-200
                                bg-white
                                hover:text-disco-cyan hover:bg-slate-100
                                focus:outline-none
                              "
                            >select file</span>
                          </div>
                        </div>

                        <VeeField
                          :id="field.id"
                          :type="field.type"
                          :name="field.id"
                          class="h-full w-full opacity-0"
                          :accept="field.extension"
                        />
                      </div>
                    </div>
                    <div
                      class="flex justify-between items-center text-gray-400"
                    >
                      <span>Accepted file type: {{ field.extension }} only</span>
                      <span class="flex items-center"><i class="fa fa-lock mr-1" /> secure</span>
                    </div>
                    <ErrorMessage
                      class="text-red-600"
                      :name="field.id"
                    />
                  </div>

                  <FieldArray
                    v-else-if="field.type == 'array'"
                    :id="field.id"
                    v-slot="{ fields, push, remove }"
                    :name="field.id"
                  >
                    <br>
                    <fieldset
                      v-for="(f, idx) in fields"
                      :key="f.key"
                    >
                      <div
                        class="
                          grid grid-flow-col
                          auto-cols-max
                          md:auto-cols-min
                          space-x-2
                        "
                      >
                        <div class="w-4/5 md:w-full">
                          <VeeField
                            :id="`${field.id}_${idx}`"
                            :name="`${field.id}[${idx}]`"
                            :placeholder="field.default"
                            class="
                              inline
                              bg-gray-100
                              appearance-none
                              border-0 border-gray-200
                              rounded
                              py-2
                              px-4
                              text-gray-700
                              leading-tight
                              focus:outline-none focus:bg-white
                            "
                          />
                          <ErrorMessage
                            class="text-red-600"
                            :name="`${field.id}[${idx}]`"
                          />
                        </div>
                        <div class="w-1/5 md:w-full">
                          <button
                            type="button"
                            class="
                              inline-flex
                              transition-colors
                              duration-150
                              bg-transparent
                              rounded
                              focus:shadow-outline
                              hover:bg-red-100
                            "
                            @click="remove(idx)"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              x="0px"
                              y="0px"
                              width="40"
                              height="40"
                              viewBox="0 0 48 48"
                              style="fill: #000000"
                            >
                              <path
                                fill="#F44336"
                                d="M21.5 4.5H26.501V43.5H21.5z"
                                transform="rotate(45.001 24 24)"
                              />
                              <path
                                fill="#F44336"
                                d="M21.5 4.5H26.5V43.501H21.5z"
                                transform="rotate(135.008 24 24)"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </fieldset>

                    <button
                      type="button"
                      class="
                        inline-flex
                        items-center
                        h-10
                        px-5
                        transition-colors
                        duration-150
                        bg-transparent
                        border-0
                        rounded
                        focus:shadow-outline
                        hover:bg-gray-100
                        dark:hover:text-gray-500
                      "
                      @click="push('')"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        x="0px"
                        y="0px"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        style="fill: #6b7280"
                        class="w-4 h-4 mr-3 fill-current"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M 11 2 L 11 11 L 2 11 L 2 13 L 11 13 L 11 22 L 13 22 L 13 13 L 22 13 L 22 11 L 13 11 L 13 2 Z"
                        />
                      </svg>
                      <span class="md:text-right mb-1 md:mb-0 pr-4">
                        Add Element</span>
                    </button>
                  </FieldArray>

                  <FieldArray
                    v-else-if="field.type == 'arrayObject'"
                    :id="field.id"
                    v-slot="{ fields, push, remove }"
                    :name="field.id"
                  >
                    <br>
                    <div class="space-y-2">
                      <fieldset
                        v-for="(f, idx) in fields"
                        :key="f.key"
                      >
                        <div
                          class="
                            grid grid-flow-col
                            auto-cols-max
                            md:auto-cols-min
                            space-x-2
                          "
                        >
                          <div
                            v-for="e in field.elements"
                            :key="e.key"
                          >
                            <div class="w-2/5 md:w-full">
                              <label
                                :for="`${e.key}_${idx}`"
                                class="inline md:text-right mb-1 md:mb-0 pr-4"
                              >{{ e.key }}</label>
                              <VeeField
                                :id="`${e.key}_${idx}`"
                                :name="`${field.id}[${idx}].${e.key}`"
                                :placeholder="e.default"
                                class="
                                  inline
                                  bg-gray-100
                                  appearance-none
                                  border-0 border-gray-200
                                  rounded
                                  py-2
                                  px-4
                                  text-gray-700
                                  leading-tight
                                  focus:outline-none
                                  focus:bg-white
                                  focus:border-purple-500
                                "
                              />
                              <ErrorMessage
                                :name="`${field.id}[${idx}].${e.key}`"
                                class="text-red-600"
                              />
                            </div>
                          </div>

                          <div class="w-1/5 md:w-full">
                            <label
                              class="
                                inline
                                md:text-right
                                mb-1
                                md:mb-0
                                pr-4
                                text-black
                              "
                            >.</label>
                            <button
                              type="button"
                              class="
                                inline-flex
                                transition-colors
                                duration-150
                                bg-transparent
                                rounded
                                focus:shadow-outline
                                hover:bg-red-100
                              "
                              @click="remove(idx)"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                x="0px"
                                y="0px"
                                width="40"
                                height="40"
                                viewBox="0 0 48 48"
                                style="fill: #000000"
                              >
                                <path
                                  fill="#F44336"
                                  d="M21.5 4.5H26.501V43.5H21.5z"
                                  transform="rotate(45.001 24 24)"
                                />
                                <path
                                  fill="#F44336"
                                  d="M21.5 4.5H26.5V43.501H21.5z"
                                  transform="rotate(135.008 24 24)"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </fieldset>

                      <button
                        type="button"
                        class="
                          inline-flex
                          items-center
                          h-10
                          px-5
                          transition-colors
                          duration-150
                          bg-transparent
                          border-0
                          rounded
                          focus:shadow-outline
                          hover:bg-gray-100
                        "
                        @click="
                          push(
                            field.elements.reduce(
                              (acc, e) => ((acc[e.key] = ''), acc),
                              {}
                            )
                          )
                        "
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          x="0px"
                          y="0px"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          style="fill: #6b7280"
                          class="w-4 h-4 mr-3 fill-current"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M 11 2 L 11 11 L 2 11 L 2 13 L 11 13 L 11 22 L 13 22 L 13 13 L 22 13 L 22 11 L 13 11 L 13 2 Z"
                          />
                        </svg>
                        <span class="md:text-right mb-1 md:mb-0 pr-4">
                          Add Element</span>
                      </button>
                    </div>
                  </FieldArray>

                  <div v-else>
                    <VeeField
                      :id="field.id"
                      :name="field.id"
                      class="
                        bg-transparent
                        border-b
                        m-auto
                        block
                        focus:outline-none focus:border-green-500
                        w-full
                        mb-6
                        text-gray-700
                        pb-1
                      "
                      :as="field.as ? field.as : field.type"
                      :type="field.type"
                      :placeholder="field.default"
                      :rows="
                        field.as === 'textarea'
                          ? field.type === 'number'
                            ? 1
                            : 6
                          : undefined
                      "
                      :value="
                        field.type === 'checkbox' ? field.default : undefined
                      "
                      :step="
                        field.type === 'number' && field.as === 'textarea'
                          ? 'any'
                          : undefined
                      "
                    />
                  </div>

                  <ErrorMessage
                    class="text-red-600"
                    :name="field.id"
                  />
                  <span>{{ errors.field }}</span>
                </div>
              </div>
            </template>
          </IconCard>
        </div>
        <!-- Submit button -->
        <!-- <div class="w-auto flex space-x-4">
          <button
            type="submit"
            class="
                w-1/6
                text-lg
                border-2 border-transparent
                bg-green-500
                ml-9
                py-2
                px-4
                p
                font-bold
                uppercase
                text-white
                rounded
                transform
                transition
                motion-reduce:transform-none
                duration-500
                focus:outline-none
              "
          >
            Submit
          </button>
          <button
            ref="resetButton"
            type="reset"
            value="Reset"
            class="
                w-1/6
                text-lg
                border-2 border-transparent
                bg-green-500
                ml-9
                py-2
                px-4
                font-bold
                uppercase
                text-white
                rounded
                transform
                transition
                motion-reduce:transform-none
                duration-500
                focus:outline-none
              "
          >
            Reset
          </button>

          <a
            href="https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw"
            class="
                w-2/5
                text-lg text-center
                border-2 border-transparent
                bg-green-500
                ml-9
                py-2
                px-4
                font-bold
                uppercase
                text-white
                rounded
                transform
                transition
                motion-reduce:transform-none
                duration-500
                focus:outline-none
              "
          >
            Request Help on Slack
          </a>
        </div> -->
      </div>
    </form>
  </VeeForm>
</template>

<script lang="ts">
import * as yup from 'yup'
import { List } from 'immutable'
import {
  Field as VeeField,
  Form as VeeForm,
  ErrorMessage,
  FieldArray
} from 'vee-validate'

import { sections, FormSection, FormField } from '@/form'
import IconCard from '@/components/containers/IconCard.vue'

export default {
  name: 'NewTaskCreationForm',
  components: {
    IconCard,
    VeeField,
    VeeForm,
    ErrorMessage,
    FieldArray
  },
  data () {
    // data property defining which task-specific fields should be rendered
    const dataType = 'tabular'
    // validation schema used by the yup package
    const schemaData = {}
    List(sections).forEach((section) => {
      List(section.fields).forEach((field) => {
        // only validate fields with a yup property (not valid for files)
        if (field.yup) schemaData[field.id] = field.yup.label(field.name)
      })
    })
    const schema = yup.object(schemaData)
    return {
      dataType,
      schema,
      sections
    }
  },
  methods: {
    allFields (section: FormSection): FormField[] {
      return section.fields.concat(section[this.dataType])
    }
  }
}
</script>

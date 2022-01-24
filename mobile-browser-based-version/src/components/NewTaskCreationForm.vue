<template>
  <base-layout v-bind:withSection="true">
    <!-- Form definition -->
    <vee-form v-slot="{ errors, handleSubmit }" :validation-schema="schema">
      <form @submit="handleSubmit($event, onSubmit)">
        <div class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1">
          <div v-for="formSection in formSections" :key="formSection.id">
            <title-card :title="formSection.title">
              <div class="space-y-4">
                <div v-for="field in allFields(formSection)" :key="field.id">
                  <label
                    class="
                      inline
                      text-gray-500
                      font-bold
                      md:text-right
                      mb-1
                      md:mb-0
                      pr-4
                      dark:text-white
                    "
                    v-bind:for="field.id"
                  >
                    {{ field.name }}
                  </label>
                  <vee-field
                    v-if="field.type == 'select' && field.id == 'dataType'"
                    v-bind:as="field.type"
                    v-model="dataType"
                    v-bind:name="field.id"
                    v-bind:id="field.id"
                    class="
                      bg-transparent
                      border-b
                      m-auto
                      block
                      focus:outline-none focus:border-green-500
                      w-full
                      mb-6
                      text-gray-700
                      dark:text-gray-100
                      pb-1
                    "
                    v-slot="{ value }"
                  >
                    <option
                      v-for="option in field.options"
                      :key="option"
                      :value="option"
                      :selected="value && value.includes(option)"
                    >
                      {{ option }}
                    </option>
                  </vee-field>

                  <vee-field
                    v-else-if="field.type == 'select' && field.id != 'dataType'"
                    v-bind:as="field.type"
                    v-bind:name="field.id"
                    v-bind:id="field.id"
                    class="
                      bg-transparent
                      border-b
                      m-auto
                      block
                      focus:outline-none focus:border-green-500
                      w-full
                      mb-6
                      text-gray-700
                      dark:text-gray-100
                      pb-1
                    "
                    v-slot="{ value }"
                  >
                    <option
                      v-for="option in field.options"
                      :key="option"
                      :value="option"
                      :selected="value && value.includes(option)"
                    >
                      {{ option }}
                    </option>
                  </vee-field>

                  <vee-field
                    v-else-if="field.type == 'select-multiple'"
                    as="select"
                    v-bind:name="field.id"
                    v-bind:id="field.id"
                    class="
                      bg-transparent
                      border-b
                      m-auto
                      block
                      focus:outline-none focus:border-green-500
                      w-full
                      mb-6
                      text-gray-700
                      dark:text-gray-100
                      pb-1
                    "
                    v-slot="{ value }"
                    multiple
                  >
                    <option
                      v-for="option in field.options"
                      :key="option"
                      :value="option"
                      :selected="value && value.includes(option)"
                    >
                      {{ option }}
                    </option>
                  </vee-field>

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
                              /></svg
                            ><span class="block text-gray-400 font-normal"
                              >Drag and drop your file anywhere or</span
                            >
                            <span class="block text-gray-400 font-normal"
                              >or</span
                            >
                            <span
                              class="
                                block
                                font-normal
                                mt-2
                                p-2
                                rounded-sm
                                text-white
                                transition-colors
                                duration-200
                                bg-primary
                                hover:text-primary hover:bg-primary-100
                                dark:hover:text-light
                                dark:hover:bg-primary-dark
                                dark:bg-dark
                                focus:outline-none focus:bg-primary-100
                                dark:focus:bg-primary-dark
                                focus:ring-primary-darker
                              "
                              >select file</span
                            >
                          </div>
                        </div>

                        <vee-field
                          v-bind:type="field.type"
                          v-bind:name="field.id"
                          v-bind:id="field.id"
                          class="h-full w-full opacity-0"
                          v-bind:accept="field.extension"
                        />
                      </div>
                    </div>
                    <div
                      class="flex justify-between items-center text-gray-400"
                    >
                      <span
                        >Accepted file type: {{ field.extension }} only</span
                      >
                      <span class="flex items-center"
                        ><i class="fa fa-lock mr-1"></i> secure</span
                      >
                    </div>
                    <ErrorMessage class="text-red-600" v-bind:name="field.id" />
                  </div>

                  <FieldArray
                    v-else-if="field.type == 'array'"
                    v-bind:name="field.id"
                    v-bind:id="field.id"
                    v-slot="{ fields, push, remove }"
                  >
                    <br />
                    <fieldset v-for="(f, idx) in fields" :key="f.key">
                      <div
                        class="
                          grid grid-flow-col
                          auto-cols-max
                          md:auto-cols-min
                          space-x-2
                        "
                      >
                        <div class="w-4/5 md:w-full">
                          <vee-field
                            :id="`${field.id}_${idx}`"
                            :name="`${field.id}[${idx}]`"
                            v-bind:placeholder="field.default"
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
                            @click="remove(idx)"
                            class="
                              inline-flex
                              transition-colors
                              duration-150
                              bg-transparent
                              rounded
                              focus:shadow-outline
                              hover:bg-red-100
                            "
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
                              ></path>
                              <path
                                fill="#F44336"
                                d="M21.5 4.5H26.5V43.501H21.5z"
                                transform="rotate(135.008 24 24)"
                              ></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </fieldset>

                    <button
                      type="button"
                      @click="push('')"
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
                        ></path>
                      </svg>
                      <span class="md:text-right mb-1 md:mb-0 pr-4">
                        Add Element</span
                      >
                    </button>
                  </FieldArray>

                  <FieldArray
                    v-else-if="field.type == 'arrayObject'"
                    v-bind:name="field.id"
                    v-bind:id="field.id"
                    v-slot="{ fields, push, remove }"
                  >
                    <br />
                    <div class="space-y-2">
                      <fieldset v-for="(f, idx) in fields" :key="f.key">
                        <div
                          class="
                            grid grid-flow-col
                            auto-cols-max
                            md:auto-cols-min
                            space-x-2
                          "
                        >
                          <div v-for="e in field.elements" v-bind:key="e.key">
                            <div class="w-2/5 md:w-full">
                              <label
                                :for="`${e.key}_${idx}`"
                                class="inline md:text-right mb-1 md:mb-0 pr-4"
                                >{{ e.key }}</label
                              >
                              <vee-field
                                :id="`${e.key}_${idx}`"
                                :name="`${field.id}[${idx}].${e.key}`"
                                v-bind:placeholder="e.default"
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
                                text-white
                                dark:text-dark
                              "
                              >.</label
                            >
                            <button
                              type="button"
                              @click="remove(idx)"
                              class="
                                inline-flex
                                transition-colors
                                duration-150
                                bg-transparent
                                rounded
                                focus:shadow-outline
                                hover:bg-red-100
                              "
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
                                ></path>
                                <path
                                  fill="#F44336"
                                  d="M21.5 4.5H26.5V43.501H21.5z"
                                  transform="rotate(135.008 24 24)"
                                ></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </fieldset>

                      <button
                        type="button"
                        @click="
                          push(
                            field.elements.reduce(
                              (acc, e) => ((acc[e.key] = ''), acc),
                              {}
                            )
                          )
                        "
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
                          ></path>
                        </svg>
                        <span class="md:text-right mb-1 md:mb-0 pr-4">
                          Add Element</span
                        >
                      </button>
                    </div>
                  </FieldArray>

                  <div v-else>
                    <vee-field
                      v-bind:name="field.id"
                      v-bind:id="field.id"
                      class="
                        bg-transparent
                        border-b
                        m-auto
                        block
                        focus:outline-none focus:border-green-500
                        w-full
                        mb-6
                        text-gray-700
                        dark:text-gray-100
                        pb-1
                      "
                      v-bind:as="field.as ? field.as : field.type"
                      v-bind:type="field.type"
                      v-bind:placeholder="field.default"
                      v-bind:rows="
                        field.as === 'textarea'
                          ? field.type === 'number'
                            ? 1
                            : 6
                          : undefined
                      "
                      v-bind:value="
                        field.type === 'checkbox' ? field.default : undefined
                      "
                      v-bind:step="
                        field.type === 'number' && field.as === 'textarea'
                          ? 'any'
                          : undefined
                      "
                    />
                  </div>

                  <ErrorMessage class="text-red-600" v-bind:name="field.id" />
                  <span>{{ errors.field }}</span>
                </div>
              </div>
            </title-card>
          </div>
          <!-- Submit button -->
          <div class="w-auto flex space-x-4">
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
              type="reset"
              ref="resetButton"
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
              href="https://join.slack.com/t/deai-workspace/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw"
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
          </div>
        </div>
      </form>
    </vee-form>
  </base-layout>
</template>

<script>
// WARNING: temporay code until serialization of Task object
// Import the tasks objects Here
import { mapMutations } from 'vuex';
import BaseLayout from './containers/BaseLayout.vue';
import _ from 'lodash';
import sections from '../task_definition/form.config.js';
import TitleCard from './containers/TitleCard.vue';
import axios from 'axios';

import {
  Field as VeeField,
  Form as VeeForm,
  ErrorMessage,
  FieldArray,
  handleSubmit,
} from 'vee-validate';
import * as yup from 'yup';

export default {
  name: 'NewTaskCreationForm',
  components: {
    BaseLayout,
    TitleCard,
    VeeField,
    VeeForm,
    ErrorMessage,
    FieldArray,
  },
  data() {
    // data property defining which task-specific fields should be rendered
    const dataType = 'csv';
    const formSections = sections;
    // validation schema used by the yup package
    let schemaData = {};
    _.forEach(formSections, (s) =>
      _.forEach(
        s.fields,
        // explicit yup schema
        (f) => {
          // only validate fields with a yup property (not valid for files)
          if (f.yup) schemaData[f.id] = f.yup.label(f.name);
        } //render name instead of id in error message
      )
    );
    const schema = yup.object(schemaData);
    return {
      dataType,
      formSections,
      schema,
    };
  },
  methods: {
    ...mapMutations(['addNewTask', 'setActivePage']),
    allFields(formSection) {
      return _.concat(formSection.fields, formSection[this.dataType]);
    },
    formatTaskForServer(task) {
      //task should have a json format structure as in `tasks.json` to be correctly uploaded on server
      const formated = { taskID: task.taskID };
      _.forEach(this.formSections, (section) => {
        return (formated[section.id] = _.reduce(
          section.fields,
          (acc, field) => {
            acc[field.id] =
              field.type === 'number' ? Number(task[field.id]) : task[field.id];
            return acc;
          },
          {}
        ));
      });
      formated.trainingInformation['modelCompileData'] = _.cloneDeep(
        formated.modelCompileData
      );
      formated.trainingInformation['dataType'] = task.dataType;
      formated.trainingInformation.modelTrainData = _.reduce(
        task.modelTrainData,
        (acc, f) => {
          acc[f.trainingParameter] = f.value;
          return acc;
        },
        {}
      );
      _.unset(formated, 'modelCompileData');
      _.unset(formated, 'generalInformation');
      return formated;
    },

    async onSubmit(rawTask, { resetForm }) {
      // load model.json file provided by user
      function filePromise(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const response = await axios.get(reader.result);
            resolve(response.data);
          };
          reader.readAsDataURL(file);
        });
      }
      const files = await Promise.all([
        filePromise(rawTask.modelFile[0]),
        filePromise(rawTask.weightsFile[0]),
      ]);
      // replace content of the form by the modelFile loaded
      rawTask.modelFile = files[0];
      rawTask.weightsFile = files[1];
      const task = this.formatTaskForServer(rawTask);
      resetForm();
      // Submit values to Express server
      const response = await axios.post(
        `http://localhost:8080/${this.$store.getters.platform}/tasks/`,
        task
      );
      if (response.status === 200) {
        await this.onSubmissionSucess(task);
        this.$toast.success(
          `Task ${task.taskID} successfully uploaded on the platform`
        );
      } else {
        this.$toast.error(
          `Failed to upload Task ${task.taskID} on the platform`
        );
      }
      setTimeout(this.$toast.clear, 30000);
    },
    async onSubmissionSucess(task) {
      // manual reset of form
      this.$refs.resetButton.click();
      // add task to store to rerender TaskList component
      this.addNewTask(task);
      // got to home component
      this.goToHome();
    },
    goToHome() {
      this.setActivePage('home');
      this.$router.push({
        path: '/',
      });
    },
  },
};
</script>

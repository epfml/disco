<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main class="flex-1">
      <!-- Main Page Content -->
      <div
        class="flex flex-col items-right justify-start flex-1 h-full min-h-screen overflow-y-auto"
      >
        <section class="flex-col items-center justify-center p-4 space-y-4">
          <!-- Form definition -->
          <vee-form
            v-slot="{ errors, handleSubmit }"
            :validation-schema="schema"
          >
            <form @submit="handleSubmit($event, onSubmit)">
              <div
                class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1"
              >
                <div
                  v-for="formSection in formSections"
                  :key="formSection.title"
                >
                  <!-- Titanic's card-->
                  <div
                    class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker dark:bg-dark"
                  >
                    <div
                      class="ml-10  text-xl text-gray-500 dark:text-light ont-semibold"
                    >
                      <span class="text-primary-dark dark:text-primary-light">
                        {{ formSection.title }}
                      </span>

                      <div
                        v-for="field in allFields(formSection)"
                        :key="field.id"
                        class="text-base"
                      >
                        <label
                          class="inline text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4"
                          v-bind:for="field.id"
                        >
                          {{ field.name }}
                        </label>
                        <vee-field
                          v-if="
                            field.type == 'select' && field.id == 'dataType'
                          "
                          v-bind:as="field.type"
                          v-model="dataType"
                          v-bind:name="field.id"
                          v-bind:id="field.id"
                          class="bg-transparent border-b m-auto block focus:outline-none focus:border-green-500 w-full mb-6text-gray-700 pb-1"
                          v-slot="{ value }"
                        >
                          <option
                            v-for="option in field.options"
                            :key="option"
                            :value="option"
                            :selected="value && value.includes(option)"
                            >{{ option }}</option
                          >
                        </vee-field>

                        <vee-field
                          v-else-if="
                            field.type == 'select' && field.id != 'dataType'
                          "
                          v-bind:as="field.type"
                          v-bind:name="field.id"
                          v-bind:id="field.id"
                          class="bg-transparent border-b m-auto block focus:outline-none focus:border-green-500 w-full mb-6text-gray-700 pb-1"
                          v-slot="{ value }"
                        >
                          <option
                            v-for="option in field.options"
                            :key="option"
                            :value="option"
                            :selected="value && value.includes(option)"
                            >{{ option }}</option
                          >
                        </vee-field>

                        <vee-field
                          v-else-if="field.type == 'select-multiple'"
                          as="select"
                          v-bind:name="field.id"
                          v-bind:id="field.id"
                          class="bg-transparent border-b m-auto block focus:outline-none focus:border-green-500 w-full mb-6text-gray-700 pb-1"
                          v-slot="{ value }"
                          multiple
                        >
                          <option
                            v-for="option in field.options"
                            :key="option"
                            :value="option"
                            :selected="value && value.includes(option)"
                            >{{ option }}</option
                          >
                        </vee-field>

                        <FieldArray
                          v-else-if="field.type == 'array'"
                          v-bind:name="field.id"
                          v-bind:id="field.id"
                          v-slot="{ fields, push, remove }"
                        >
                          <br />
                          <fieldset v-for="(f, idx) in fields" :key="f.key">
                            <div class="flex space-x-2 md:space-x-8">
                              <div class="w-4/5 md:w-full">
                                <vee-field
                                  :id="`${field.id}_${idx}`"
                                  :name="`${field.id}[${idx}]`"
                                  v-bind:placeholder="field.default"
                                  class="inline bg-gray-100 appearance-none border-0 border-gray-200 rounded  py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-purple-500"
                                />
                                <ErrorMessage :name="`${field.id}[${idx}]`" />
                              </div>
                              <div class="w-1/5 md:w-full">
                                <button
                                  type="button"
                                  @click="remove(idx)"
                                  class="inline-flex transition-colors duration-150 bg-transparent rounded focus:shadow-outline hover:bg-red-100"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    x="0px"
                                    y="0px"
                                    width="40"
                                    height="40"
                                    viewBox="0 0 48 48"
                                    style=" fill:#000000;"
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
                            class="inline-flex items-center h-10 px-5 transition-colors duration-150 bg-transparent border-0 rounded focus:shadow-outline hover:bg-gray-100"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              x="0px"
                              y="0px"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              style=" fill:#6B7280;"
                              class="w-4 h-4 mr-3 fill-current "
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
                          <fieldset v-for="(f, idx) in fields" :key="f.key">
                            <div class="flex space-x-2 md:space-x-8">
                              <div
                                v-for="e in field.elements"
                                v-bind:key="e.key"
                              >
                                <div class="w-2/5 md:w-full">
                                  <label
                                    :for="`${e.key}_${idx}`"
                                    class="inline  md:text-right mb-1 md:mb-0 pr-4 "
                                    >{{ e.key }}</label
                                  >
                                  <vee-field
                                    :id="`${e.key}_${idx}`"
                                    :name="`${field.id}[${idx}].${e.key}`"
                                    v-bind:placeholder="e.default"
                                    class="inline bg-gray-100 appearance-none border-0 border-gray-200 rounded  py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-purple-500"
                                  />
                                  <ErrorMessage
                                    :name="`${field.id}[${idx}].${e.key}`"
                                  />
                                </div>
                              </div>

                              <div class="w-1/5 md:w-full">
                                <button
                                  type="button"
                                  @click="remove(idx)"
                                  class="inline-flex transition-colors duration-150 bg-transparent rounded focus:shadow-outline hover:bg-red-100"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    x="0px"
                                    y="0px"
                                    width="40"
                                    height="40"
                                    viewBox="0 0 48 48"
                                    style=" fill:#000000;"
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
                            class="inline-flex items-center h-10 px-5 transition-colors duration-150 bg-transparent border-0 rounded focus:shadow-outline hover:bg-gray-100"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              x="0px"
                              y="0px"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              style=" fill:#6B7280;"
                              class="w-4 h-4 mr-3 fill-current "
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

                        <div v-else>
                          <vee-field
                            v-bind:name="field.id"
                            v-bind:id="field.id"
                            class="bg-transparent border-b m-auto block focus:outline-none focus:border-green-500 w-full mb-6text-gray-700 pb-1"
                            v-bind:as="field.as ? field.as : field.type"
                            v-bind:type="field.type"
                            v-bind:placeholder="field.default"
                            v-bind:row="
                              field.as === 'textarea'
                                ? field.type === 'number'
                                  ? 1
                                  : 2
                                : undefined
                            "
                            v-bind:value="
                              field.type === 'checkbox'
                                ? field.default
                                : undefined
                            "
                            v-bind:step="
                              field.type === 'number' && field.as === 'textarea'
                                ? 'any'
                                : undefined
                            "
                          />
                        </div>

                        <ErrorMessage
                          class="text-red-600"
                          v-bind:name="field.id"
                        />
                        <span>{{ errors.field }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- Submit button -->
                <div class="w-auto flex space-x-4">
                  <button
                    type="submit"
                    class="w-1/6 text-lg border-2 border-transparent bg-green-500 ml-9 py-2 px-4 p font-bold uppercase text-white rounded transform transition motion-reduce:transform-none duration-500 focus:outline-none"
                  >
                    Submit
                  </button>
                  <button
                    type="reset"
                    ref="resetButton"
                    value="Reset"
                    class="w-1/6 text-lg border-2 border-transparent bg-green-500 ml-9 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none duration-500 focus:outline-none"
                  >
                    Reset
                  </button>
                  <a
                    href="https://join.slack.com/t/deai-workspace/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw"
                    class="w-2/5 text-lg text-center border-2 border-transparent bg-green-500 ml-9 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none duration-500 focus:outline-none"
                  >
                    Request Help on Slack
                  </a>
                </div>
              </div>
            </form>
          </vee-form>
        </section>
      </div>

      <!-- Main Page Footer-->
      <footer
        class="flex items-center justify-between p-4 bg-white border-t dark:bg-darker dark:border-primary-darker"
      >
        <div>De-AI &copy; 2021</div>
        <div>
          Join us on
          <a
            href="https://github.com/epfml/DeAI"
            target="_blank"
            class="text-blue-500 hover:underline"
            >Github</a
          >
        </div>
      </footer>
    </main>
  </div>
</template>

<script>
// WARNING: temporay code until serialization of Task object
// Import the tasks objects Here
import { CsvTask } from "../task_definition/csv_task";
import { ImageTask } from "../task_definition/image_task";
import _ from "lodash";
import { defineComponent } from "vue";
const axios = require("axios");

import {
  Field as VeeField,
  Form as VeeForm,
  ErrorMessage,
  FieldArray,
  handleSubmit,
} from "vee-validate";
import * as yup from "yup";

export default {
  name: "taskForm",
  components: {
    VeeField,
    VeeForm,
    ErrorMessage,
    FieldArray,
  },
  data() {
    // data property defining which task-specific fields should be rendered
    const dataType = "other";
    /* form generator
         each section should contain :
            - `fields` (general fields)
            - `csv`    (fields only relevant for csv tasks)
            - `image`  (fields only relevant for image tasks)
            - `other`  (empty rendering which no data type has been chosens)
    */
    const formSections = [
      // *** Section ***
      {
        title: "General Information",
        id: "generalInformation",
        fields: [
          {
            id: "taskId",
            name: "Task Identifier",
            yup: yup.string().required(),
            as: "input",
            type: "text",
            default: "eg. : minst",
          },
          {
            id: "dataType",
            name: "Data Type",
            yup: yup.string().required(),
            as: "input",
            type: "select",
            options: ["image", "csv", "other"],
            default: "eg. : other",
          },
        ],
        csv: [],
        image: [],
        other: [],
      },
      // *** Section ***
      {
        title: "Display Information",
        id: "displayInformation",
        fields: [
          {
            id: "taskTitle",
            name: "Title",
            yup: yup.string().required(),
            as: "input",
            type: "text",
            default: "eg. : MNIST",
          },
          {
            id: "summary",
            name: "Summary",
            yup: yup.string().required(),
            as: "textarea",
            type: "textarea",
            default:
              "eg. : Test our platform by using a publicly available <b>image</b> dataset. <br><br> Download the classic MNIST imagebank of hand-written numbers <a class='underline text-primary-dark dark:text-primary-light' href='https://www.kaggle.com/scolianni/mnistasjpg'>here</a>. <br> This model learns to identify hand written numbers.",
          },
          {
            id: "overview",
            name: "Overview",
            yup: yup.string().required(),
            as: "textarea",
            type: "textarea",
            default:
              "eg. : The MNIST handwritten digit classification problem is a standard dataset used in computer vision and deep learning. Although the dataset is effectively solved, we use it to test our Decentralised Learning algorithms and platform.",
          },
          {
            id: "model",
            name: "Model",
            yup: yup.string().required(),
            as: "textarea",
            type: "textarea",
            default:
              "eg. : The current model is a very simple CNN and its main goal is to test the app and the Decentralizsed Learning functionality.",
          },
          {
            id: "tradeoffs",
            name: "Tradeoffs",
            yup: yup.string().required(),
            as: "textarea",
            type: "textarea",
            default:
              "eg. : We are using a simple model, first a 2d convolutional layer > max pooling > 2d convolutional layer > max pooling > convolutional layer > 2 dense layers.",
          },
          {
            id: "dataFormatInformation",
            name: "Data Format Information",
            yup: yup.string().required(),
            as: "textarea",
            type: "textarea",
            default:
              "eg. : This model is trained on images corresponding to digits 0 to 9. You can upload each digit image of your dataset in the box corresponding to its label. The model taskes images of size 28x28 as input.",
          },
          {
            id: "dataExampleText",
            name: "Data Example Text",
            yup: yup.string().required(),
            as: "input",
            type: "text",
            default:
              "eg. : Below you can find an example of an expected image representing the digit 9.",
          },
        ],
        csv: [
          {
            id: "dataExample",
            name: "Data Example",
            yup: yup
              .array()
              .of(
                yup
                  .object()
                  .shape({
                    columnName: yup
                      .string()
                      .required()
                      .label("Column Name"),
                    columnData: yup
                      .string()
                      .required()
                      .label("Column Data"),
                  })
                  .required()
              )
              .strict(),
            as: "input",
            type: "arrayObject",
            elements: [
              {
                key: "columnName",
                default: "eg. : PassengerId",
              },
              {
                key: "columnData",
                default: "eg. : 1",
              },
            ],
          },
          {
            id: "headers",
            name: "Headers",
            yup: yup.array().of(yup.string().required()),
            as: "input",
            type: "array",
            default: "eg. : PassengerId",
          },
        ],
        image: [
          {
            id: "dataExampleImage",
            name: "Data Example Image",
            yup: yup.string().required(),
            as: "input",
            type: "text",
            default: "eg. : ./9-mnist-example.png",
          },
        ],
        other: [],
      },
      // *** Section ***
      {
        title: "Training Information",
        id: "trainingInformation",
        fields: [
          {
            id: "modelId",
            name: "Model Identifier",
            yup: yup.string().required(),
            as: "input",
            type: "text",
            default: "eg. : mnist-model",
          },
          {
            id: "port",
            name: "Port",
            yup: yup
              .number()
              .integer()
              .positive()
              .required(),
            as: "input",
            type: "number",
            default: "eg. : 9001",
          },
          {
            id: "epoch",
            name: "Epoch",
            yup: yup
              .number()
              .integer()
              .positive()
              .required(),
            as: "input",
            type: "number",
            default: "eg. : 10",
          },
          {
            id: "validationSplit",
            name: "Validation split",
            yup: yup
              .number()
              .positive()
              .lessThan(1)
              .required(),
            as: "textarea",
            type: "number",
            default: "eg. : 0.2",
          },
          {
            id: "batchSize",
            name: "Batch size",
            yup: yup
              .number()
              .integer()
              .positive()
              .required(),
            as: "input",
            type: "number",
            default: "eg. : 30",
          },
          {
            id: "learningRate",
            name: "Learning rate",
            yup: yup
              .number()
              .positive()
              .required(),
            as: "textarea",
            type: "number",
            default: "eg. : 0.05",
          },
          {
            id: "modelTrainData",
            name: "Model Train Data",
            yup: yup
              .array()
              .of(
                yup
                  .object()
                  .shape({
                    trainingParameter: yup
                      .string()
                      .required()
                      .label("Training Parameter"),
                    value: yup
                      .string()
                      .required()
                      .label("Value"),
                  })
                  .required()
              )
              .strict(),
            as: "input",
            type: "arrayObject",
            elements: [
              {
                key: "trainingParameter",
                default: "eg. : epochs",
              },
              {
                key: "value",
                default: "eg. : 10",
              },
            ],
          },
        ],
        csv: [
          {
            id: "receivedMessagesThreshold",
            name: "Received Messages Threshold",
            yup: yup.number().required(),
            as: "input",
            type: "number",
            default: "eg. : 1",
          },
          {
            id: "outputColumn",
            name: "Output Column",
            yup: yup.string().required(),
            as: "input",
            type: "text",
            default: "eg. : Survived",
          },
          {
            id: "inputColumn",
            name: "Input Column",
            yup: yup
              .array()
              .of(yup.string())
              .min(1)
              .required(),
            as: "input",
            type: "array",
            default: "eg. : PassengerId",
          },
        ],
        image: [
          {
            id: "threshold",
            name: "Threshold",
            yup: yup
              .number()
              .integer()
              .positive()
              .required(),
            as: "input",
            type: "number",
            default: "eg. : 1",
          },
          {
            id: "IMAGE_H",
            name: "Hight of Image (pixels)",
            yup: yup
              .number()
              .integer()
              .positive()
              .required(),
            as: "input",
            type: "number",
            default: "eg. : 28",
          },
          {
            id: "IMAGE_W",
            name: "Width of Image (pixels)",
            yup: yup
              .number()
              .integer()
              .positive()
              .required(),
            as: "input",
            type: "number",
            default: "eg. : 28",
          },
          {
            id: "LABEL_LIST",
            name: "List of labels",
            yup: yup
              .array()
              .of(yup.string())
              .min(1)
              .required(),
            as: "input",
            type: "array",
            default: "eg. : 0",
          },
          {
            id: "NUM_CLASSES",
            name: "Number of classes",
            yup: yup
              .number()
              .positive()
              .required(),
            as: "input",
            type: "number",
            default: "eg. : 2",
          },
          {
            id: "LABEL_ASSIGNMENT",
            name: "List of labels",
            yup: yup
              .array()
              .of(
                yup
                  .object()
                  .shape({
                    stringLabel: yup
                      .string()
                      .required()
                      .label("Label (string)"),
                    intLabel: yup
                      .string()
                      .required()
                      .label("Label (int)"),
                  })
                  .required()
              )
              .strict(),
            as: "input",
            type: "arrayObject",
            elements: [
              {
                key: "stringLabel",
                default: "eg. : airplane",
              },
              {
                key: "intLabel",
                default: "eg. : 1",
              },
            ],
          },
          {
            id: "csvLabels",
            name: "Are labels stored as CSV ?",
            yup: yup.boolean().required(),
            as: "input",
            type: "checkbox",
            default: false,
          },
          {
            id: "aggregateImagesById",
            name: "Aggregate Images By Id",
            yup: yup.boolean(),
            as: "input",
            type: "checkbox",
            default: false,
          },
        ],
        other: [],
      },
      // *** Section ***
      {
        title: "Model Compile Data",
        id: "modelCompileData",
        fields: [
          {
            id: "optimizer",
            name: "Optimizer",
            yup: yup.string().required(),
            type: "select",
            options: [
              "sgd",
              "momentum",
              "adagrad",
              "adadelta",
              "adam",
              "adamax",
              "rmsprop",
            ],
            default: "eg. : rmsprop",
          },
          {
            id: "loss",
            name: "Loss",
            yup: yup.string().required(),
            type: "select",
            options: [
              "absoluteDifference",
              "computeWeightedLoss",
              "cosineDistance",
              "hingeLoss",
              "huberLoss",
              "logLoss",
              "meanSquaredError",
              "sigmoidCrossEntropy",
              "softmaxCrossEntropy",
            ],
            default: "eg. : categoricalCrossentropy",
          },
          {
            id: "metrics",
            name: "Metrics (multiple can be selected)",
            yup: yup
              .array()
              .of(yup.string())
              .min(1)
              .required(),
            type: "select-multiple",
            options: [
              "binaryAccuracy",
              "binaryCrossentropy",
              "categoricalAccuracy",
              "categoricalCrossentropy",
              "cosineProximity",
              "meanAbsoluteError",
              "meanAbsolutePercentageError",
              "meanSquaredError",
              "precision",
              "recall",
              "sparseCategoricalAccuracy",
            ],
            default: ["accuracy"],
          },
        ],
        csv: [],
        image: [],
        other: [],
      },
    ];
    let schemaData = {};
    _.forEach(formSections, (s) =>
      _.forEach(
        s.fields,
        // explicit yup schema
        (f) => (schemaData[f.id] = f.yup.label(f.name)) //render name instead of id in error message
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
    allFields(formSection) {
      return _.concat(formSection.fields, formSection[this.dataType]);
    },
    formTaskForServer(task) {
      //task should have a json format structure as in `tasks.json` to be correctly uploaded on server
      const formated = { taskId: task.taskId };
      _.forEach(this.formSections, (section) => {
        return (formated[section.id] = _.reduce(
          section.fields,
          (acc, field) => {
            acc[field.id] = task[field.id];
            return acc;
          },
          {}
        ));
      });
      formated.trainingInformation["modelCompileData"] = _.cloneDeep(
        formated.modelCompileData
      );
      formated.trainingInformation["dataType"] = task.dataType;
      formated.trainingInformation.modelTrainData = _.reduce(task.modelTrainData, (acc,f) => {
        acc[f.trainingParameter] = f.value;
        return acc;
      },{})
      _.unset(formated, "modelCompileData");
      _.unset(formated, "generalInformation");
      return formated;
    },

    async onSubmit(rawTask, { resetForm }) {
      const task = this.formTaskForServer(rawTask);
      resetForm();
      // Submit values to Express server
      const response = await axios.post("http://localhost:8080/tasks/", task);
      if (response.status === 200) {
        await this.onSubmissionSucess(task);
        this.$toast.success(
          `Task ${task.taskId} successfully uploaded on the platform`
        );
      } else {
        this.$toast.error(
          `Failed to upload Task ${task.taskId} on the platform`
        );
      }
      setTimeout(this.$toast.clear, 30000);
    },
    async onSubmissionSucess(task) {
      // manual reset of form
      this.$refs.resetButton.click();
      // add task to store to rerender TaskList component
      await this.$store.commit("addJSONTask", { task: task });
      // got to home component
      this.goToHome();
    },
    goToHome() {
      this.$emit("gotohome");
      this.$router.push({
        path: "/",
      });
    },
  },
};
</script>

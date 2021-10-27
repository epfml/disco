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
                                ? any
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
  handleSubmit,
} from "vee-validate";
import * as yup from "yup";

export default {
  name: "taskForm",
  components: {
    VeeField,
    VeeForm,
    ErrorMessage,
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
      {
        title: "Data Type",
        id: "dataType",
        fields: [
          {
            id: "dataType",
            name: "Data Type",
            yup: yup.string().required(),
            as: "input",
            type: "select",
            options: ["image", "csv", "other"],
            default: "other",
          },
        ],
        csv: [],
        image: [],
        other: [],
      },
      {
        title: "Display Information",
        id: "displayInformation",
        fields: [
          {
            id: "taskId",
            name: "Task Identifier",
            yup: yup.string().required(),
            as: "input",
            type: "text",
            default: "minst",
          },
          {
            id: "taskTitle",
            name: "Title",
            yup: yup.string().required(),
            as: "input",
            type: "text",
            default: "MNIST",
          },
          {
            id: "summary",
            name: "Summary",
            yup: yup.string().required(),
            as: "textarea",
            type: "textarea",
            default:
              "Test our platform by using a publicly available <b>image</b> dataset. <br><br> Download the classic MNIST imagebank of hand-written numbers <a class='underline text-primary-dark dark:text-primary-light' href='https://www.kaggle.com/scolianni/mnistasjpg'>here</a>. <br> This model learns to identify hand written numbers.",
          },
          {
            id: "overview",
            name: "Overview",
            yup: yup.string().required(),
            as: "textarea",
            type: "textarea",
            default:
              "The MNIST handwritten digit classification problem is a standard dataset used in computer vision and deep learning. Although the dataset is effectively solved, we use it to test our Decentralised Learning algorithms and platform.",
          },
          {
            id: "model",
            name: "Model",
            yup: yup.string().required(),
            as: "textarea",
            type: "textarea",
            default:
              "The current model is a very simple CNN and its main goal is to test the app and the Decentralizsed Learning functionality.",
          },
          {
            id: "tradeoffs",
            name: "Tradeoffs",
            yup: yup.string().required(),
            as: "textarea",
            type: "textarea",
            default:
              "We are using a simple model, first a 2d convolutional layer > max pooling > 2d convolutional layer > max pooling > convolutional layer > 2 dense layers.",
          },
          {
            id: "dataFormatInformation",
            name: "Data Format Information",
            yup: yup.string().required(),
            as: "textarea",
            type: "textarea",
            default:
              "This model is trained on images corresponding to digits 0 to 9. You can upload each digit image of your dataset in the box corresponding to its label. The model taskes images of size 28x28 as input.",
          },
          {
            id: "dataExampleText",
            name: "Data Example Text",
            yup: yup.string().required(),
            as: "input",
            type: "text",
            default:
              "Below you can find an example of an expected image representing the digit 9.",
          },
        ],
        csv: [
          {
            id: "dataExample",
            name: "Data Example",
            yup: yup.string().required(), //to change
            as: "input",
            type: "text",
            default: [
              { columnName: "PassengerId", columnData: "1" },
              { columnName: "Survived", columnData: "0" },
              { columnName: "Name", columnData: "Braund, Mr. Owen Harris" },
              { columnName: "Sex", columnData: "male" },
            ],
          },
          {
            id: "headers",
            name: "Headers",
            yup: yup.string().required(), //to change
            as: "input",
            type: "text",
            default: ["PassengerId", "Survived", "Name", "Sex"],
          },
        ],
        image: [
          {
            id: "dataExampleImage",
            name: "Data Example Image",
            yup: yup.string().required(),
            as: "input",
            type: "text",
            default: "./9-mnist-example.png",
          },
        ],
        other: [],
      },
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
            default: "mnist-model",
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
            default: 9001,
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
            default: 10,
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
            default: 0.2,
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
            default: 30,
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
            default: 0.05,
          },
          {
            id: "modelTrainData",
            name: "Model Train Data",
            yup: yup.string().required(),
            as: "input",
            type: "text",
            default: { epochs: 10 }, //{id:'epochs',  name:'Epochs',yup : yup.number().integer().positive().required(), type:'number',default:10},
          },
        ],
        csv: [
          {
            id: "receivedMessagesThreshold",
            name: "Received Messages Threshold",
            yup: yup.number().required(),
            as: "input",
            type: "number",
            default: 1,
          },
          {
            id: "inputColumns",
            name: "Received Messages Threshold",
            yup: yup.string().required(),
            as: "input",
            type: "text",
            default: "Survived",
          },
          {
            id: "outputColumn",
            name: "Output Column",
            yup: yup
              .array()
              .of(yup.string())
              .min(1)
              .required(),
            as: "input",
            type: "text",
            default: ["PassengerId", "Age", "SibSp", "Parch", "Fare", "Pclass"],
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
            default: 1,
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
            default: 28,
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
            default: 28,
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
            type: "text",
            default: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
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
            default: 2,
          },
          {
            id: "LABEL_ASSIGNMENT",
            name: "List of labels",
            yup: yup
              .array()
              .of(yup.object())
              .min(1)
              .required(),
            as: "input",
            type: "text",
            default: {
              airplane: 0,
              automobile: 1,
              bird: 2,
              cat: 3,
              deer: 4,
              dog: 5,
              frog: 6,
              horse: 7,
              ship: 8,
              truck: 9,
            },
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
      {
        title: "Model Compile Data",
        id: "trainingInformation",
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
            default: "rmsprop",
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
            default: "categoricalCrossentropy",
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
    async onSubmit(task) {
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
      console.log(task);
      // manual reset of form
      this.$refs.resetButton.click();
      // add task to store to rerender TaskList component
      await this.$store.commit("addTask", { task: task });
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

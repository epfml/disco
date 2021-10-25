<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main class="flex-1">
      <!-- Main Page Content -->
      <div
        class="flex flex-col items-right justify-start flex-1 h-full min-h-screen overflow-y-auto"
      >
        <section class="flex-col items-center justify-center p-4 space-y-4">
          <!--  action="http://localhost:8080/tasks/" method="post" @sumbit="submitForm" -->
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
                        v-for="field in formSection.fields"
                        :key="field.id"
                        class="text-base"
                      >
                        <label
                          class="inline text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4"
                          for="inline-full-name"
                        >
                          {{ field.name }}
                        </label>

                        <div v-if="field.type == 'textarea'">
                          <vee-field
                            as="textarea"
                            row="3"
                            v-bind:name="field.id"
                            v-bind:id="field.id"
                            class="bg-transparent border-b m-auto block focus:outline-none focus:border-green-500 w-full mb-6text-gray-700 pb-1"
                            v-bind:type="field.type"
                            v-bind:placeholder="field.default"
                          />
                        </div>

                        <vee-field
                          v-else-if="field.type == 'select'"
                          as="select"
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
                            v-bind:type="field.type"
                            v-bind:placeholder="field.default"
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
  useForm,
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
    const formSections = [
      {
        title: "Display Information",
        fields: [
          {
            id: "taskId",
            name: "Task Identifier",
            yup: yup.string().required(),
            type: "text",
            default: "minst",
          },
          {
            id: "taskTitle",
            name: "Title",
            yup: yup.string().required(),
            type: "text",
            default: "MNIST",
          },
          {
            id: "summary",
            name: "Summary",
            yup: yup.string().required(),
            type: "textarea",
            default:
              "Test our platform by using a publicly available <b>image</b> dataset. <br><br> Download the classic MNIST imagebank of hand-written numbers <a class='underline text-primary-dark dark:text-primary-light' href='https://www.kaggle.com/scolianni/mnistasjpg'>here</a>. <br> This model learns to identify hand written numbers.",
          },
          {
            id: "overview",
            name: "Overview",
            yup: yup.string().required(),
            type: "textarea",
            default:
              "The MNIST handwritten digit classification problem is a standard dataset used in computer vision and deep learning. Although the dataset is effectively solved, we use it to test our Decentralised Learning algorithms and platform.",
          },
          {
            id: "model",
            name: "Model",
            yup: yup.string().required(),
            type: "textarea",
            default:
              "The current model is a very simple CNN and its main goal is to test the app and the Decentralizsed Learning functionality.",
          },
          {
            id: "tradeoffs",
            name: "Tradeoffs",
            yup: yup.string().required(),
            type: "textarea",
            default:
              "We are using a simple model, first a 2d convolutional layer > max pooling > 2d convolutional layer > max pooling > convolutional layer > 2 dense layers.",
          },
          {
            id: "dataFormatInformation",
            name: "Data Format Information",
            yup: yup.string().required(),
            type: "textarea",
            default:
              "This model is trained on images corresponding to digits 0 to 9. You can upload each digit image of your dataset in the box corresponding to its label. The model taskes images of size 28x28 as input.",
          },
          {
            id: "dataExampleText",
            name: "Data Example Text",
            yup: yup.string().required(),
            type: "text",
            default:
              "Below you can find an example of an expected image representing the digit 9.",
          },
          {
            id: "dataExampleImage",
            name: "Data Example Image",
            yup: yup.string().required(),
            type: "text",
            default: "./9-mnist-example.png",
          },
        ],
      } /*
      {
        title:'Training Information',
        fields:[
          {id:'modelId', name : 'Model Identifier',yup:yup.string().required(),  type: 'text', default: "mnist-model"}, 
          {id:'port'   , name : 'Port', yup:yup.number().integer().positive().required(), type: 'number', default:9001},
          {id:'epoch'  , name : 'Epoch', yup:yup.number().integer().positive().required(), type: 'number', default:10}, 
          {id:'validationSplit', name:'Validation split', yup:yup.number().positive().lessThan(1).required(), type: 'number', default:0.2}, 
          {id:'batchSize', name:'Batch size', yup:yup.number().integer().positive().required(), type: 'number', default:30}, 
       ]
      },
      { 
        title:"Model Compile Data",
        fields:[  
          {id:'optimizer', name : 'Optimizer', yup: yup.string().required(), type:'select', options:['sgd','momentum','adagrad','adadelta','adam','adamax','rmsprop'],default:"rmsprop"},
          {id:'loss',      name : 'Loss'     , yup: yup.string().required(), type:'select', options:['absoluteDifference','computeWeightedLoss','cosineDistance','hingeLoss','huberLoss','logLoss','meanSquaredError','sigmoidCrossEntropy','softmaxCrossEntropy'],default:"categoricalCrossentropy"},
          {id:'metrics'  , name : 'Metrics (multiple can be selected)'  , yup: yup.array().of(yup.string()).min(1).required(), type:'select-multiple', options:['binaryAccuracy','binaryCrossentropy','categoricalAccuracy','categoricalCrossentropy','cosineProximity','meanAbsoluteError','meanAbsolutePercentageError','meanSquaredError','precision','recall','sparseCategoricalAccuracy'],default:["accuracy"]}
        ]
      },
      {
        title:"Model Train Data",
        fields:[
          {id:'epochs',  name:'Epochs',yup : yup.number().integer().positive().required(), type:'number',default:10},
          {id:'threshold',  name:'Threshold',yup : yup.number().integer().positive().required(), type:'number',default:1},
          {id:'dataType',  name:'Data Type',yup : yup.string().required(), type:'select', options:['image','csv','other'],default:"image"},
          {id:'IMAGE_H',  name:'Hight of Image (pixels)',yup : yup.number().integer().positive().required(), type:'number',default:28},
          {id:'IMAGE_W',  name:'Width of Image (pixels)',yup : yup.number().integer().positive().required(), type:'number',default:28},
          {id:'LABEL_LIST',  name:'List of labels',yup : yup.array().of(yup.string()).min(1).required(), type:'text',default:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]},
          {id:'aggregateImagesById',  name:'Aggregate Images By Id',yup : yup.boolean(), type:'checkout',default:false},
        ]
      },*/,
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
      formSections,
      schema,
    };
  },
  methods: {
    onSubmit(values) {
      // Submit values to API...
      axios.post("http://localhost:8080/tasks/", values).then(
        (response) => {
          if (response.status === 200) {
            this.$toast.success(
              `Task ${values.taskId} successfully uploaded on the platform`
            );
            this.$refs.resetButton.click(); //manual reset of form
            this.goToHome();
          } else {
            this.$toast.error(
              `Failed to upload Task ${values.taskId} on the platform`
            );
          }
          setTimeout(this.$toast.clear, 30000);
        },
        (error) => {
          this.$toast.error(
            `Failed to upload Task ${values.taskId} on the platform`
          );
          setTimeout(this.$toast.clear, 30000);
          console.log(error);
        }
      );
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

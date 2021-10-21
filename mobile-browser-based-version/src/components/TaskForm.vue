<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main class="flex-1">
      <!-- Main Page Content -->
      <div
        class="flex flex-col items-right justify-start flex-1 h-full min-h-screen overflow-y-auto"
      >
        <section class="flex-col items-center justify-center p-4 space-y-4">
          
          <vee-form v-slot="{ errors }" @sumbit="onSubmit" :validation-schema="schema">
          
          
          <div class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1"> 
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
                  {{formSection.title}}
                </span>     

                <div
                  v-for="field in formSection.fields"
                  :key="field.id"
                  class="text-base"
                >
                  <label class="inline text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4" for="inline-full-name">
                    {{field.name}}
                  </label>
                  
                  <div v-if="field.type =='textarea'">
                   <vee-field 
                    as="textarea"
                    row=3
                    v-bind:name="field.name"
                    v-bind:id="field.id"
                    class="bg-transparent border-b m-auto block focus:outline-none focus:border-green-500 w-full mb-6text-gray-700 pb-1"
                    v-bind:type="field.type"
                    v-bind:placeholder="field.default"
                  />
                  </div>
                  
                  <div v-else>
                  <vee-field 
                    v-bind:name="field.name"
                    v-bind:id="field.id"
                    class="bg-transparent border-b m-auto block focus:outline-none focus:border-green-500 w-full mb-6text-gray-700 pb-1"
                    v-bind:type="field.type"
                    v-bind:placeholder="field.default"
                  />
                  </div>
                  <ErrorMessage class="text-red-600" v-bind:name="field.name" />  
                  <span>{{ errors.field }}</span>

                </div>
              </div>
            </div>      
          </div>
          <!-- Submit button -->
            <button
              type="button"
              class="w-1/6 text-lg border-2 border-transparent bg-green-500 ml-9 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none duration-500 focus:outline-none"
              >Submit</button>
          </div>
              <pre>{{ values }}</pre>
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
import { CsvTask } from '../task_definition/csv_task';
import { ImageTask } from '../task_definition/image_task';
import _ from 'lodash';
import { defineComponent } from 'vue';

import { 
  Field as VeeField, 
  Form as VeeForm, 
  ErrorMessage,
  defineRule, 
  } from 'vee-validate';
import * as yup from 'yup';


export default {
  name:'taskForm',
  components: {
    VeeField,
    VeeForm,
    ErrorMessage,
  },
  data() {
    const formSections = [
      {title:'Display Information', 
       fields: [
        {id:'taskId'   ,name:'Task Identifier', yup: yup.string().required(), type: 'text', default: 'minst'},
        {id:'taskTitle',name:'Title'          , yup: yup.string().required(), type: 'text', default: 'MNIST'},
        {id:'summary'  ,name:'Summary'        , yup: yup.string().required(), type: 'textarea', default: "Test our platform by using a publicly available <b>image</b> dataset. <br><br> Download the classic MNIST imagebank of hand-written numbers <a class='underline text-primary-dark dark:text-primary-light' href='https://www.kaggle.com/scolianni/mnistasjpg'>here</a>. <br> This model learns to identify hand written numbers."},
        {id:'overview' ,name:'Overview'       , yup: yup.string().required(), type: 'textarea', default: "The MNIST handwritten digit classification problem is a standard dataset used in computer vision and deep learning. Although the dataset is effectively solved, we use it to test our Decentralised Learning algorithms and platform."},
        {id:'model'    ,name:'Model'          , yup: yup.string().required(), type: 'textarea', default: "The current model is a very simple CNN and its main goal is to test the app and the Decentralizsed Learning functionality."},
        {id:'tradeoffs',name:'Tradeoffs'      , yup: yup.string().required(), type: 'textarea', default: "We are using a simple model, first a 2d convolutional layer > max pooling > 2d convolutional layer > max pooling > convolutional layer > 2 dense layers."},
        {id:'dataFormatInformation',name: 'Data Format Information' ,yup: yup.string().required(), type: 'textarea', default: "This model is trained on images corresponding to digits 0 to 9. You can upload each digit image of your dataset in the box corresponding to its label. The model taskes images of size 28x28 as input."},
        {id:'dataExampleText'      ,name: 'Data Example Text'       ,yup: yup.string().required(), type: 'text', default: "Below you can find an example of an expected image representing the digit 9."},
        {id:'dataExampleImage'     ,name: 'Data Example Image'      ,yup: yup.string().required(), type: 'text', default: "./9-mnist-example.png"},
       ]  
      },
      {title:'Training Information',
      fields:[
        {id:'modelId', name : 'Model Identifier',yup:yup.string().required(),  type: 'text', default: "mnist-model"}, 
        {id:'port'   , name : 'Port', yup:yup.number().integer().positive().required(), type: 'number', default:9001},
        {id:'epoch'  , name : 'Epoch', yup:yup.number().integer().positive().required(), type: 'number', default:10}, 
        {id:'validationSplit', name:'Validation split', yup:yup.number().positive().lessThan(1).required(), type: 'number', default:0.2}, 
        {id:'batchSize', name:'Batch size', yup:yup.number().integer().positive().required(), type: 'number', default:30}, 
       ]
      },
    ]
    let schemaData = {};
    _.forEach(formSections, 
      s => _.forEach(s.fields,
        f => schemaData[f.name] = f.yup
    ));
    const schema = yup.object(schemaData);
    /*const schema = yup.object({
      taskId: yup.string().required(),
      //displayInformation 
      taskTitle: yup.string().required(), 
      summary:   yup.string().required(), 
      overview:  yup.string().required(),
      model:     yup.string().required(), 
      tradeoffs: yup.string().required(), 
      dataFormatInformation: yup.string().required(),
      dataExampleText:  yup.string().required(), 
      dataExampleImage: yup.string().required(),
      //trainingInformation
      modelId: yup.string().required(), //"mnist-model",
      port:    yup.number().integer().positive().required(), //9001,
      epoch:   yup.number().integer().positive().required(), //10,
      validationSplit:  yup.number().positive().lessThan(1).required(), //0.2,
      batchSize: yup.number().integer().positive().required(), //30,
      //modelCompileData"
        optimizer: yup.string().required(), //"rmsprop",
        loss:      yup.string().required(), //"categoricalCrossentropy",
        metrics:   yup.array().of(yup.string()).min(1).required(), //["accuracy"]
      //modelTrainData"
        epochs:    yup.number().integer().positive().required(), //10
      threshold:   yup.number().integer().positive().required(), //1,
      dataType:    yup.string().required(), //"image",
      IMAGE_H:     yup.number().integer().positive().required(), //28,
      IMAGE_W:     yup.number().integer().positive().required(), //28,
      LABEL_LIST:  yup.array().of(yup.string()).min(1).required(),//["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
      aggregateImagesById: yup.boolean()//false
    });*/
    return {
      formSections,
      schema,
    };
  },
  methods: {
    // Validator function
    isRequired(value) {
      return value ? true : 'This field is required';
    },
    nSubmit(values) {
      console.log(JSON.stringify(values, null ,2));
    }
  },
};
</script>

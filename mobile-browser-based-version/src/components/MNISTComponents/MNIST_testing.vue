<template>
  <div
    class="flex flex-col pt-4 items-right justify-start flex-1 h-full min-h-screen p-4 overflow-x-hidden overflow-y-auto"
  >
    <!-- Data Format Card -->
    <a id="overview-target">
      <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
        <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
          <!-- Card header -->
          <div
            class="flex items-center justify-between p-4 border-b dark:border-primary"
          >
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Data Format Information
            </h4>
            <div class="flex items-center">
              <span aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  class="bi bi-card-checklist w-7 h-7"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"
                  />
                  <path
                    d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0zM7 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 0 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z"
                  />
                </svg>
              </span>
            </div>
          </div>
          <!-- Descrition -->
          <div class="relative p-4 overflow-x-scroll">
            <span class="text-sm text-gray-500 dark:text-light">{{
              DataFormatInfoText
            }}</span>
          </div>
        </div>
      </div>
    </a>

    <!-- Data Example Card -->
    <a id="limitations-target">
      <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
        <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
          <!-- Card header -->
          <div
            class="flex items-center justify-between p-4 border-b dark:border-primary"
          >
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Data Example
            </h4>
            <div class="flex items-center">
              <span aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  class="bi bi-file-earmark-ruled w-7 h-7"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5v2zM3 12v-2h2v2H3zm0 1h2v2H4a1 1 0 0 1-1-1v-1zm3 2v-2h7v1a1 1 0 0 1-1 1H6zm7-3H6v-2h7v2z"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div class="relative p-4 overflow-x-scroll">
            <span class="text-sm text-gray-500 dark:text-light">{{
              DataExampleText
            }}</span>
          </div>

          <!-- Data Point Example -->
          <div class="relative p-4 overflow-x-scroll">
            <table class="table-auto">
              <thead>
                <tr>
                  <th class="px-4 py-2 text-emerald-600">Title</th>
                  <th class="px-4 py-2 text-emerald-600">Author</th>
                  <th class="px-4 py-2 text-emerald-600">Views</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    Intro to CSS
                  </td>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    Adam
                  </td>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    858
                  </td>
                </tr>
                <tr class="bg-emerald-200">
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    A Long and Winding Tour of the History of UI Frameworks and
                    Tools and the Impact on Design
                  </td>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    Adam
                  </td>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    112
                  </td>
                </tr>
                <tr>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    Intro to JavaScript
                  </td>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    Chris
                  </td>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    1,280
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </a>

    <!-- Upload File Card-->
    <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
      <div class="container mx-width lg h-full">
        <!-- Card header -->
        <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
          <div
            class="flex items-center justify-between p-4 border-b dark:border-primary"
          >
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Upload My Data
            </h4>
            <div class="flex items-center">
              <span aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  class="bi bi-cloud-upload w-7 h-7"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z"
                  />
                  <path
                    fill-rule="evenodd"
                    d="M7.646 4.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V14.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3z"
                  />
                </svg>
              </span>
            </div>
          </div>
        </div>
        <div class="relative pb-4">
          <article
            aria-label="File Upload Modal"
            class="relative h-full flex flex-col p-4 bg-white rounded-lg dark:bg-darker"
            ondrop="dropHandler(event);"
            ondragover="dragOverHandler(event);"
            ondragleave="dragLeaveHandler(event);"
            ondragenter="dragEnterHandler(event);"
          >
            <!-- scroll area -->
            <section
              class="h-full overflow-auto p-8 w-full h-full flex flex-col"
            >
              <header
                class="border-dashed border-2 border-gray-500 dark:border-primary flex flex-col justify-center items-center"
              >
                <p
                  class="mb-3 p-4 text-lg font-semibold dark:text-lightflex flex-wrap justify-center"
                >
                  <span>Drag and drop your</span>&nbsp;<span
                    >files anywhere or</span
                  >
                </p>
                <input id="hidden-input" type="file" multiple class="hidden"/>
                <div class="p-4">
                  <button
                    id="button"
                    class="mt-2 p-2 rounded-sm text-white transition-colors duration-200 bg-primary hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark focus:outline-none focus:bg-primary-100 dark:focus:bg-primary-dark focus:ring-primary-darker"
                  >
                    Upload files
                  </button>
                </div>
              </header>

              <div class="pt-4">
                <h1
                  class="pt-8 pb-3 font-semibold sm:text-lg dark:text-lightflex"
                >
                  Files Selected
                </h1>

                <ul id="gallery" class="flex flex-1 flex-wrap -m-1">
                  <li
                    id="empty"
                    class="h-full w-full text-center flex flex-col items-center justify-center items-center"
                  >
                    <img
                      class="mx-auto w-32"
                      src="https://user-images.githubusercontent.com/507615/54591670-ac0a0180-4a65-11e9-846c-e55ffce0fe7b.png"
                      alt="no data"
                    />
                    <span class="text-small text-gray-500 dark:text-lightflex"
                      >No files selected</span
                    >
                  </li>
                </ul>
              </div>
            </section>
          </article>
        </div>
      </div>
    </div>

    <!-- Test Button -->
    <div class="flex items-center justify-center p-4">
      <button
        v-on:click="test_model()"
        type="button"
        class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
      >
        Test
      </button>
    </div>

    <div id="predictions"></div>

    <!-- Upload Image Data Template-->
    <template id="image-template">
      <li class="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24">
        <article
          tabindex="0"
          class="group hasImage w-full h-full rounded-md focus:outline-none focus:shadow-outline bg-gray-100 cursor-pointer relative text-transparent hover:text-white shadow-sm"
        >
          <img
            alt="upload preview"
            class="img-preview w-full h-full sticky object-cover rounded-md bg-fixed"
          />

          <section
            class="flex flex-col rounded-md text-xs break-words w-full h-full z-20 absolute top-0 py-2 px-3"
          >
            <h1 class="flex-1"></h1>
            <div class="flex">
              <span class="p-1">
                <i>
                  <svg
                    class="fill-current w-4 h-4 ml-auto pt-"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M5 8.5c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5c0 .829-.672 1.5-1.5 1.5s-1.5-.671-1.5-1.5zm9 .5l-2.519 4-2.481-1.96-4 5.96h14l-5-8zm8-4v14h-20v-14h20zm2-2h-24v18h24v-18z"
                    />
                  </svg>
                </i>
              </span>

              <p class="p-1 size text-xs"></p>
              <button
                class="delete ml-auto focus:outline-none hover:bg-gray-300 p-1 rounded-md"
              >
                <svg
                  class="pointer-events-none fill-current w-4 h-4 ml-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    class="pointer-events-none"
                    d="M3 6l3 18h12l3-18h-18zm19-4v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z"
                  />
                </svg>
              </button>
            </div>
          </section>
        </article>
      </li>
    </template>
  </div>
</template>


<script>
import * as tf from "@tensorflow/tfjs";

export default {
  data() {
    return {
      title: "mnist-testing",
      DataFormatInfoText:
        "Verum ad istam omnem orationem brevis est defensio. Nam quoad aetas M. Caeli dare potuit isti suspicioni locum, fuit primum ipsius pudore, deinde etiam patris diligentia disciplinaque munita. Qui ut huic virilem togam deditšnihil dicam hoc loco de me; tantum sit, quantum vos existimatis; hoc dicam, hunc a patre continuo ad me esse deductum; nemo hunc M. Caelium in illo aetatis flore vidit nisi aut cum patre aut mecum aut in M. Crassi castissima domo, cum artibus honestissimis erudiretur.",
      DataExampleText:
        "Verum ad istam omnem orationem brevis est defensio. Nam quoad aetas M. Caeli dare potuit isti suspicioni locum, fuit primum ipsius pudore, deinde etiam patris diligentia disciplinaque munita. Qui ut huic virilem togam deditšnihil dicam hoc loco de me; tantum sit, quantum vos existimatis; hoc dicam, hunc a patre continuo ad me esse deductum; nemo hunc M. Caelium in illo aetatis flore vidit nisi aut cum patre aut mecum aut in M. Crassi castissima domo, cum artibus honestissimis erudiretur.",

      // Different Task Labels
      task_labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      IMAGE_HEIGHT: 224,
      IMAGE_WIDTH: 224,
  
      model_name: "MOBILENET_model",
      model: null,
      FILES: [],
    };
  },
  methods: {

    /**
     * Creates the tf.model
     * TO DO: fetch model from local storage
     * @returns Returns a tf.model for training
     */
    get_model() {
      if(!this.model){
        this.model = this.create_model()
      }
      return this.model
    },

    async create_model(){
        const MOBILENET_MODEL_PATH =
        "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json";
        
        const model = await tf.loadLayersModel(MOBILENET_MODEL_PATH);

        // Warmup the model. This isn't necessary, but makes the first prediction
        // faster. Call `dispose` to release the WebGL memory allocated for the return
        // value of `predict`.
        model.predict(tf.zeros([1, this.IMAGE_HEIGHT, this.IMAGE_WIDTH, 3])).dispose();
        return model
    },

    test_model(){
      const filesElement = document.getElementById("hidden-input");

      let file = filesElement.files[0];

      // Only process image files (skip non image files)
      if (file && file.type.match("image.*")) {
        let reader = new FileReader();
        reader.onload = (e) => {
          // Fill the image & call predict.
          let img = document.createElement("img");
          img.src = e.target.result;
          img.width = this.IMAGE_WIDTH;
          img.height = this.IMAGE_HEIGHT;
          img.onload = () => this.predict(img);
        };

        // Read in the image file as a data URL.
        reader.readAsDataURL(file);
      } 
    },

    async predict(imgElement){
        const model_path = "localstorage://".concat(this.model_name);
        const loadedModel = await tf.loadLayersModel(model_path);

        const logits = tf.tidy(() => {
            // tf.browser.fromPixels() returns a Tensor from an image element.
            const img = tf.browser.fromPixels(imgElement).toFloat();

            const offset = tf.scalar(127.5);
            // Normalize the image from [0, 255] to [-1, 1].
            const normalized = img.sub(offset).div(offset);

            // Reshape to a single-element batch so we can pass it to predict.
            const batched = normalized.reshape([1, this.IMAGE_WIDTH, this.IMAGE_HEIGHT, 3]);

            // Make a prediction through mobilenet.
            return loadedModel.predict(batched);
        })
        // Convert logits to probabilities and class names.
        // Convert logits to probabilities and class names.
        const classes = await this.getTopKClasses(logits, 5);

        console.log(classes);
        // Show the classes in the DOM.
        this.showResults(imgElement, classes);
    },

    showResults(imgElement, classes) {
        const predictionContainer = document.createElement("div");
        predictionContainer.className = "pred-container";

        const imgContainer = document.createElement("div");
        imgContainer.appendChild(imgElement);
        predictionContainer.appendChild(imgContainer);

        const probsContainer = document.createElement("div");
        for (let i = 0; i < classes.length; i++) {
            const row = document.createElement("div");
            row.className = "row";

            const classElement = document.createElement("div");
            classElement.className = "cell";
            classElement.innerText = classes[i].className;
            row.appendChild(classElement);

            const probsElement = document.createElement("div");
            probsElement.className = "cell";
            probsElement.innerText = classes[i].probability.toFixed(3);
            row.appendChild(probsElement);

            probsContainer.appendChild(row);
        }
        predictionContainer.appendChild(probsContainer);

        const predictionsElement = document.getElementById("predictions");
        predictionsElement.insertBefore(
            predictionContainer,
            predictionsElement.firstChild
        );
    },

    async getTopKClasses(logits, topK) {
        const IMAGENET_CLASSES = {}
        const values = await logits.data();

        const valuesAndIndices = [];
        for (let i = 0; i < values.length; i++) {
            valuesAndIndices.push({ value: values[i], index: i });
        }
        valuesAndIndices.sort((a, b) => {
            return b.value - a.value;
        });
        const topkValues = new Float32Array(topK);
        const topkIndices = new Int32Array(topK);
        for (let i = 0; i < topK; i++) {
            topkValues[i] = valuesAndIndices[i].value;
            topkIndices[i] = valuesAndIndices[i].index;
        }

        const topClassesAndProbs = [];
        for (let i = 0; i < topkIndices.length; i++) {
            topClassesAndProbs.push({
            className: IMAGENET_CLASSES[topkIndices[i]],
            probability: topkValues[i],
            });
        }
        return topClassesAndProbs;
    },

    /**
     * Creates a convolutional neural network (Convnet) for the MNIST data.
     *
     * @returns {tf.Model} An instance of tf.Model.
     */
    createConvModel(){
      const IMAGE_H = 28;
      const IMAGE_W = 28;
      // Create a sequential neural network model. tf.sequential provides an API
      // for creating "stacked" models where the output from one layer is used as
      // the input to the next layer.
      const model = tf.sequential();
    
      // The first layer of the convolutional neural network plays a dual role:
      // it is both the input layer of the neural network and a layer that performs
      // the first convolution operation on the input. It receives the 28x28 pixels
      // black and white images. This input layer uses 16 filters with a kernel size
      // of 5 pixels each. It uses a simple RELU activation function which pretty
      // much just looks like this: __/
      model.add(tf.layers.conv2d({
        inputShape: [IMAGE_H, IMAGE_W, 3],
        kernelSize: 3,
        filters: 16,
        activation: 'relu'
      }));
    
      // After the first layer we include a MaxPooling layer. This acts as a sort of
      // downsampling using max values in a region instead of averaging.
      // https://www.quora.com/What-is-max-pooling-in-convolutional-neural-networks
      model.add(tf.layers.maxPooling2d({poolSize: 2, strides: 2}));
    
      // Our third layer is another convolution, this time with 32 filters.
      model.add(tf.layers.conv2d({kernelSize: 3, filters: 32, activation: 'relu'}));
    
      // Max pooling again.
      model.add(tf.layers.maxPooling2d({poolSize: 2, strides: 2}));
    
      // Add another conv2d layer.
      model.add(tf.layers.conv2d({kernelSize: 3, filters: 32, activation: 'relu'}));
    
      // Now we flatten the output from the 2D filters into a 1D vector to prepare
      // it for input into our last layer. This is common practice when feeding
      // higher dimensional data to a final classification output layer.
      model.add(tf.layers.flatten({}));
    
      model.add(tf.layers.dense({units: 64, activation: 'relu'}));
    
      // Our last layer is a dense layer which has 10 output units, one for each
      // output class (i.e. 0, 1, 2, 3, 4, 5, 6, 7, 8, 9). Here the classes actually
      // represent numbers, but it's the same idea if you had classes that
      // represented other entities like dogs and cats (two output classes: 0, 1).
      // We use the softmax function as the activation for the output layer as it
      // creates a probability distribution over our 10 classes so their output
      // values sum to 1.
      model.add(tf.layers.dense({units: 10, activation: 'softmax'}));
    
      return model;
  },
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function () {
      // Code that will run only after the
      // entire view has been rendered
      let model = await this.create_model()
      this.model = model
      const save_path = "localstorage://".concat(this.model_name)
      const saveResults = await model.save(save_path)

      const imageTempl = document.getElementById("image-template"),
        empty = document.getElementById("empty");

      function addFile(target, file) {
            const objectURL = URL.createObjectURL(file);

            const clone = imageTempl.cloneNode(true)

            clone.querySelector("h1").textContent = file.name;
            clone.querySelector("li").id = objectURL;
            clone.querySelector(".delete").dataset.target = objectURL;
            clone.querySelector(".size").textContent =
            file.size > 1024
                ? file.size > 1048576
                ? Math.round(file.size / 1048576) + "mb"
                : Math.round(file.size / 1024) + "kb"
                : file.size + "b";

            Object.assign(clone.querySelector("img"), {
                src: objectURL,
                alt: file.name,
            });

            empty.classList.add("hidden");
            target.prepend(clone.firstElementChild);
      }

      const gallery = document.getElementById("gallery")
      const hidden = document.getElementById("hidden-input");
      document.getElementById("button").onclick = () => hidden.click();
      hidden.onchange = (e) => {
        for (const file of e.target.files) {
          addFile(gallery, file);
        }
      };

      /**
       * Returns the CSS colors graphs should be rendered in
       */
      const cssColors = (color) => {
        return getComputedStyle(document.documentElement).getPropertyValue(
          color
        );
      };

      /**
       * Returns the colors depending on user's choice graphs should be rendered in
       */
      const getColor = () => {
        return window.localStorage.getItem("color") ?? "cyan";
      };

      // Initilization of the color's constant
      // TO DO: add listeners to modify color when changement added
      const colors = {
        primary: cssColors(`--color-${getColor()}`),
        primaryLight: cssColors(`--color-${getColor()}-light`),
        primaryLighter: cssColors(`--color-${getColor()}-lighter`),
        primaryDark: cssColors(`--color-${getColor()}-dark`),
        primaryDarker: cssColors(`--color-${getColor()}-darker`),
      };
    });
  },
};
</script>
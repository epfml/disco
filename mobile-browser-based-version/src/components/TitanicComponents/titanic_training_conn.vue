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
            <span
              style="white-space: pre-line"
              class="text-sm text-gray-500 dark:text-light"
              >{{ DataFormatInfoText }}</span
            >
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
            <span
              style="white-space: pre-line"
              class="text-sm text-gray-500 dark:text-light"
              >{{ DataExampleText }}</span
            >
          </div>

          <!-- Data Point Example -->
          <div class="relative p-4 overflow-x-scroll">
            <table class="table-auto">
              <thead>
                <tr>
                  <th
                    v-for="example in DataExample"
                    :key="example"
                    class="px-4 py-2 text-emerald-600"
                  >
                    {{ example.column_name }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    v-for="example in DataExample"
                    :key="example"
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    {{ example.column_data }}
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
                <input id="hidden-input" type="file" multiple class="hidden" />
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

    <!-- Modification of Header Card -->
    <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
      <!-- Card header -->
      <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
        <div
          class="flex items-center justify-between p-4 border-b dark:border-primary"
        >
          <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
            Map My Data
          </h4>
          <div class="flex items-center">
            <span aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                class="bi bi-bezier2 w-7 h-7"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M1 2.5A1.5 1.5 0 0 1 2.5 1h1A1.5 1.5 0 0 1 5 2.5h4.134a1 1 0 1 1 0 1h-2.01c.18.18.34.381.484.605.638.992.892 2.354.892 3.895 0 1.993.257 3.092.713 3.7.356.476.895.721 1.787.784A1.5 1.5 0 0 1 12.5 11h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5H6.866a1 1 0 1 1 0-1h1.711a2.839 2.839 0 0 1-.165-.2C7.743 11.407 7.5 10.007 7.5 8c0-1.46-.246-2.597-.733-3.355-.39-.605-.952-1-1.767-1.112A1.5 1.5 0 0 1 3.5 5h-1A1.5 1.5 0 0 1 1 3.5v-1zM2.5 2a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm10 10a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1z"
                />
              </svg>
            </span>
          </div>
        </div>

        <!-- Display all the possible headers -->
        <div id="mapHeader">
          <ul class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 xl:grid-cols-4">
            <li
              class="border-gray-400"
              v-for="header in headers"
              :key="header.id"
            >
              <div
                class="select-none p-2 transition duration-500 ease-in-out transform hover:-translate-y-2 rounded-2xl border-2 p-6 hover:shadow-2xl border-primary-dark"
              >
                <div class="grid grid-cols-1 grid-rows-2 items-center">
                  <div class="pl-1">
                    <div class="font-medium">
                      <div class="flex flex-row justify-start">
                        {{ header.id }} &rarr; {{ header.userHeader }}
                      </div>
                    </div>
                  </div>
                  <div class="mb-3 pt-0">
                    <input
                      type="text"
                      v-model="header.userHeader"
                      placeholder="Enter your header"
                      class="px-3 py-3 placeholder-gray-400 text-gray-700 relative bg-white bg-white rounded text-sm shadow outline-none focus:outline-none focus:shadow-outline w-full"
                    />
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Train Button -->
    <div class="flex items-center justify-center p-4">
      <button
        v-on:click="join_training(false)"
        type="button"
        class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
      >
        Train Alone
      </button>
      <button
        v-if="!fallback"
        v-on:click="join_training(true)"
        type="button"
        class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
      >
        Train Distributed
      </button>
    </div>

    <!-- Training Board -->
    <div
      x-transition:enter="transition duration-300 ease-in-out"
      x-transition:enter-start="opacity-0"
      x-transition:enter-end="opacity-100"
      x-ref="trainingBoard"
      x-show="isTraining"
    >
      <!-- Validation Accuracy users chart -->
      <div class="grid grid-cols-2 p-4 space-x-4 lg:gap-2">
        <div class="col-span-1 bg-white rounded-md dark:bg-darker">
          <!-- Card header -->
          <div class="p-4 border-b dark:border-primary">
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Validation Accuracy of the Model
            </h4>
          </div>
          <p class="p-4">
            <span
              class="text-2xl font-medium text-gray-500 dark:text-light"
              id="val_accuracy"
              >0</span
            >
            <span class="text-sm font-medium text-gray-500 dark:text-primary"
              >% of validation accuracy</span
            >
          </p>
          <!-- Chart -->
          <div class="relative p-4">
            <canvas id="valAccuracyChart"></canvas>
          </div>
        </div>

        <div class="col-span-1 bg-white rounded-md dark:bg-darker">
          <!-- Card header -->
          <div class="p-4 border-b dark:border-primary">
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Training Accuracy of the Model
            </h4>
          </div>
          <p class="p-4">
            <span
              class="text-2xl font-medium text-gray-500 dark:text-light"
              id="accuracy"
              >0</span
            >
            <span class="text-sm font-medium text-gray-500 dark:text-primary"
              >% of training accuracy</span
            >
          </p>
          <!-- Chart -->
          <div class="relative p-4">
            <canvas id="accuracyChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- exchange_messages -->
    <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
      <!-- Card header -->
      <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
        <div
          class="flex items-center justify-between p-4 border-b dark:border-primary"
        >
          <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
            Peer Training Console
          </h4>
          <div class="flex items-center">
            <span aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                class="bi bi-bezier2 w-7 h-7"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M8.646 5.646a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L10.293 8 8.646 6.354a.5.5 0 0 1 0-.708zm-1.292 0a.5.5 0 0 0-.708 0l-2 2a.5.5 0 0 0 0 .708l2 2a.5.5 0 0 0 .708-.708L5.707 8l1.647-1.646a.5.5 0 0 0 0-.708z"
                />
                <path
                  d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z"
                />
                <path
                  d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z"
                />
              </svg>
            </span>
          </div>
        </div>

        <div id="mapHeader">
          <ul class="grid grid-cols-1 p-4">
            <li
              class="border-gray-400"
              v-for="(message, index) in exchange_messages.messages"
              :key="index"
            >
              <div class="relative overflow-x-scroll">
                <span
                  style="white-space: pre-line"
                  class="text-sm text-gray-500 dark:text-light"
                  >{{ message }}</span
                >
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Save the model button -->
    <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
      <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
        <div
          class="flex items-center justify-between p-4 border-b dark:border-primary"
        >
          <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
            Save the model
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
                  fill-rule="evenodd"
                  d="M3.5 6a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 1 0-1h2A1.5 1.5 0 0 1 14 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-8A1.5 1.5 0 0 1 3.5 5h2a.5.5 0 0 1 0 1h-2z"
                />
                <path
                  fill-rule="evenodd"
                  d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"
                />
              </svg>
            </span>
          </div>
        </div>
        <!-- Descrition -->
        <div class="relative p-4 overflow-x-scroll">
          <span
            style="white-space: pre-line"
            class="text-sm text-gray-500 dark:text-light"
            >If you are satisifed with the performance of the model, don't
            forget to save the model by clicking on the button below. The next
            time you will load the application, you will be able to use your
            saved model.
          </span>
        </div>
        <div class="flex items-center justify-center p-4">
          <button
            id="train-model-button"
            v-on:click="save_model()"
            class="text-lg border-2 border-transparent bg-primary ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
          >
            Save My model
          </button>
        </div>
      </div>
    </div>

    <!-- Upload File Data Template -->
    <template id="file-template">
      <li class="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24">
        <article
          tabindex="0"
          class="group w-full h-full rounded-md focus:outline-none focus:shadow-outline elative bg-gray-100 cursor-pointer relative shadow-sm"
        >
          <img
            alt="upload preview"
            class="img-preview hidden w-full h-full sticky object-cover rounded-md bg-fixed"
          />

          <section
            class="py-2 px-3 flex flex-col rounded-md text-xs break-words w-full h-full z-20 absolute top-0"
          >
            <h1 class="flex-1 group-hover:text-blue-800"></h1>
            <div class="flex">
              <span class="p-1 text-blue-800">
                <i>
                  <svg
                    class="fill-current w-4 h-4 ml-auto pt-1"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M15 2v5h5v15h-16v-20h11zm1-2h-14v24h20v-18l-6-6z"
                    />
                  </svg>
                </i>
              </span>
              <p class="p-1 size text-xs text-gray-700"></p>
              <button
                class="delete ml-auto focus:outline-none hover:bg-gray-300 p-1 rounded-md text-gray-800"
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
import {
  display_informations,
  training_information,
  data_preprocessing,
} from "./titanic_script"; // <-- Change import here

import * as Chart from "chart.js";
import { training, training_distributed } from "../../helpers/training-script";
import * as tf from "@tensorflow/tfjs";

import { onEpochEnd_common, makeid } from "../../helpers/helpers";
import {
  getModel,
  setModel,
  store_model,
} from "../../helpers/indexedDB_script";

import {
  PeerJS,
  send_model,
  send_data,
  load_model,
  handle_data,
  handle_data_end,
} from "../../helpers/peer";

import { MessageConsole } from "../../helpers/message_console";

import Peer from "peerjs";
// var Peer = require("peerjs")

// Variables used for training
var model = null;
var peerjs = null;
var peer = null;
var model_train_data = {
  epochs: training_information.epoch,
};
var recv_buffer = {
  train_info: {
    epochs: training_information.epoch,
  },
};
var model_compile_data = training_information.model_compile_data;

var receivers = [];

export default {
  data() {
    return {
      // Variables for general informations
      model_name: "",
      DataFormatInfoText: "",
      DataExampleText: "",
      DataExample: null,
      fallback: false,
      // Headers related to training task of containing item of the form {id: "", userHeader: ""}
      headers: [],

      // Variabldes for feed-backs when training
      valAccuracyChart: null,
      accuracyChart: null,
      val_accuracy: null,
      accuracy: null,
      exchange_messages: new MessageConsole(10),

      // Variables for communications
      epoch: 0,
      threshold: null,
      peerjs_id: null,
    };
  },
  methods: {
    save_model() {
      store_model(model, "saved_".concat(training_information.model_id));
      this.$toast.success(
        "The ".concat(training_information.model_id).concat(` has been saved.`)
      );
      setTimeout(this.$toast.clear, 30000);
    },

    async join_training(distributed) {
      const filesElement = document.getElementById("hidden-input");

      // Check that the user indeed gave a file
      if (filesElement.files.length == 0) {
        alert("Training aborted. No uploaded file given as input.");
      } else {
        // Assume we only read the first file
        let file = filesElement.files[0];

        let reader = new FileReader();
        reader.onload = async (e) => {
          // Preprocess the data and get object of the form {accepted: True/False, Xtrain: training data, ytrain: lavels}
          var processed_data = await data_preprocessing(e, this.headers);
          var accepted = processed_data.accepted;
          var Xtrain = processed_data.Xtrain;
          var ytrain = processed_data.ytrain;
          if (accepted) {
            // Notification Start Training
            this.$toast.success(
              `Thank you for your contribution. Training has started`
            );
            setTimeout(this.$toast.clear, 30000);

            if (!distributed) {
              console.log("here");
              await training(
                model,
                this.model_name,
                Xtrain,
                ytrain,
                32,
                0.2,
                30,
                this.updateUI
              );
            } else {
              await this.initReceivers();
              await training_distributed(
                model,
                this.model_name,
                Xtrain,
                ytrain,
                model_train_data,
                32,
                0.2,
                model_compile_data,
                this.onEpochBegin,
                this.onEpochEnd,
                peerjs,
                recv_buffer
              );
            }
            // Notification End Training
            this.$toast.success(
              this.model_name.concat(` has finished training!`)
            );
            setTimeout(this.$toast.clear, 30000);
          }
        };
        reader.readAsText(file);
      }
    },

    /**
     * #######################################
     * METHODS FOR UPDATING GRAPHS ON THE UI
     * #######################################
     */

    /**
     * Method used to update the two graphs to give user informations about the training process
     * @param {Number} epoch The epoch number of the current training
     * @param {Number} _accuracy The accuracy achieved by the model in the given epoch
     * @param {Number} validationAccuracy The validation accuracy achieved by the model in the given epoch
     */
    updateUI(epoch, _accuracy, validationAccuracy) {
      this.updateAccuracy(epoch, _accuracy);
      this.updateValidationAccuracy(epoch, validationAccuracy);
    },

    /**
     * Method to update tha accuracy chart when training
     * @param {Number} epoch The epoch number of the current training
     * @param {Number} _accuracy The accuracy achieved by the model in the given epoch
     */
    async updateAccuracy(epoch, _accuracy) {
      this.accuracyChart.data.datasets[0].data.push(_accuracy);
      this.accuracyChart.data.datasets[0].data.splice(0, 1);
      this.accuracyChart.data.labels.push(epoch);
      this.accuracyChart.data.labels.splice(0, 1);
      await this.accuracyChart.update();
      this.accuracy.innerText = _accuracy;
    },

    /**
     * Method to update tha validation accuracy chart when training
     * @param {Number} epoch The epoch number of the current training
     * @param {Number} _accuracy The validation accuracy achieved by the model in the given epoch
     */
    async updateValidationAccuracy(epoch, accuracy) {
      this.valAccuracyChart.data.datasets[0].data.push(accuracy);
      this.valAccuracyChart.data.datasets[0].data.splice(0, 1);
      this.valAccuracyChart.data.labels.push(epoch);
      this.valAccuracyChart.data.labels.splice(0, 1);
      await this.valAccuracyChart.update();
      this.val_accuracy.innerText = accuracy;
    },

    /**
     * #######################################
     * METHODS FOR COMMUNICATION
     * #######################################
     */

    /**
     * Method called at the begining of each training epoch
     */
    onEpochBegin() {
      console.log("EPOCH: ", ++this.epoch);
    },

    /**
     * Method called at the end of each epoch
     * Configured to handle communication with peers
     * @param {Number} epoch The epoch number of the current training
     * @param {Number} _accuracy The accuracy achieved by the model in the given epoch
     * @param {Number} validationAccuracy The validation accuracy achieved by the model in the given epoch
     */
    async onEpochEnd(epoch, _accuracy, validationAccuracy) {
      this.updateUI(epoch, _accuracy, validationAccuracy);
      // At the moment, don't allow for new participants to come in.
      // Wait for a synchronization scheme (on epoch number).
      await this.updateReceivers();
      if (this.receivers.length > 0) {
        /*if (this.fallback) {
              this.fallback = false;
              this.exchange_messages.addMessage("New peer(s) found, training is distributed again.");
          }*/
        await onEpochEnd_common(
          model,
          epoch,
          receivers,
          recv_buffer,
          this.peerjs_id,
          this.threshold,
          peerjs,
          this.exchange_messages
        );
      } else {
        if (!this.fallback) {
          this.fallback = true;
          this.exchange_messages.addMessage(
            "Training fell back to local mode."
          );
        }
      }
    },

    /**
     * Updates the list of receivers currently connected to the server.
     */
    async initReceivers() {
      let query_ids = await fetch(
        "http://localhost:9000/deai/peerjs/peers"
      ).then((response) => response.text());

      let all_ids = JSON.parse(query_ids);
      this.receivers = all_ids.filter((id) => id != this.peerjs_id);
    },

    /**
     * Updates the list of receivers currently connected to the server.
     * Only allow for disconnecting nodes. Newcomers need a synchronization
     * scheme before joining training (TO DO)
     */
    async updateReceivers() {
      let query_ids = await fetch(
        "http://localhost:9000/deai/peerjs/peers"
      ).then((response) => response.text());

      let all_ids = JSON.parse(query_ids);
      this.receivers = all_ids.filter((id) => {
        id != this.peerjs_id;
      });
      /*
      this.receivers = all_ids.filter((id) => {
        id != this.peerjs_id && this.receivers.includes(id)
      });*/
    },
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function () {
      // Code that will run only after the
      // entire view has been rendered

      /**
       * #######################################
       * LOAD INFORMATION ABOUT THE TASK
       * #######################################
       */

      // Initialize variables used by the components
      this.model_name = training_information.model_id;
      this.DataFormatInfoText = display_informations.dataFormatInformation;
      this.DataExampleText = display_informations.dataExampleText;
      display_informations.headers.forEach((item) => {
        this.headers.push({ id: item, userHeader: item });
      });
      this.DataExample = display_informations.dataExample;

      // Create the model
      const saved_model_path = "indexeddb://working_".concat(
        training_information.model_id
      );
      model = await tf.loadLayersModel(saved_model_path);
      model.summary();

      console.log("Connecting to PeerServer");
      this.peerjs_id = await makeid(10);
      peer = new Peer(this.peerjs_id, {
        host: "localhost",
        port: 9000,
        path: "/deai",
      });
      peer.on("error", (err) => {
        console.log("Error in connecting");
        this.fallback = true;
        this.$toast.error(
          "Failed to connect to server. Fallback to training alone."
        );
        setTimeout(this.$toast.clear, 30000);
      });
      peer.on('open', async (id) => {
        this.fallback = false;
        peerjs = await new PeerJS(peer, handle_data, recv_buffer);
        await this.initReceivers();
        console.log("Peers connected: " + this.receivers);
        this.$toast.success(
          "Succesfully connected to server. Distributed training available."
        );
        setTimeout(this.$toast.clear, 30000);
      })

      

      /**
       * #######################################
       * HANDLE DATA UPLOADING
       * #######################################
       */
      const fileTempl = document.getElementById("file-template"),
        imageTempl = document.getElementById("image-template"),
        empty = document.getElementById("empty");

      // use to store pre selected files
      let FILES = {};

      // check if file is of type image and prepend the initialied
      // template to the target element
      function addFile(target, file) {
        const isImage = file.type.match("image.*"),
          objectURL = URL.createObjectURL(file);

        const clone = isImage
          ? imageTempl.cloneNode(true)
          : fileTempl.cloneNode(true);

        clone.querySelector("h1").textContent = file.name;
        clone.querySelector("li").id = objectURL;
        clone.querySelector(".delete").dataset.target = objectURL;
        clone.querySelector(".size").textContent =
          file.size > 1024
            ? file.size > 1048576
              ? Math.round(file.size / 1048576) + "mb"
              : Math.round(file.size / 1024) + "kb"
            : file.size + "b";

        isImage &&
          Object.assign(clone.querySelector("img"), {
            src: objectURL,
            alt: file.name,
          });

        empty.classList.add("hidden");
        target.prepend(clone.firstElementChild);

        FILES[objectURL] = file;
      }

      const gallery = document.getElementById("gallery"),
        overlay = document.getElementById("overlay");

      // click the hidden input of type file if the visible button is clicked
      // and capture the selected files

      const hidden = document.getElementById("hidden-input");
      document.getElementById("button").onclick = () => hidden.click();
      hidden.onchange = (e) => {
        for (const file of e.target.files) {
          addFile(gallery, file);
        }
      };

      // use to check if a file is being dragged
      const hasFiles = ({ dataTransfer: { types = [] } }) =>
        types.indexOf("Files") > -1;

      // use to drag dragenter and dragleave events.
      // this is to know if the outermost parent is dragged over
      // without issues due to drag events on its children
      let counter = 0;

      // reset counter and append file to gallery when file is dropped
      function dropHandler(ev) {
        ev.preventDefault();
        for (const file of ev.dataTransfer.files) {
          addFile(gallery, file);
          overlay.classList.remove("draggedover");
          counter = 0;
        }
      }

      // only react to actual files being dragged
      function dragEnterHandler(e) {
        e.preventDefault();
        if (!hasFiles(e)) {
          return;
        }
        ++counter && overlay.classList.add("draggedover");
      }

      function dragLeaveHandler(e) {
        1 > --counter && overlay.classList.remove("draggedover");
      }

      function dragOverHandler(e) {
        if (hasFiles(e)) {
          e.preventDefault();
        }
      }

      // event delegation to caputre delete events
      // fron the waste buckets in the file preview cards
      gallery.onclick = ({ target }) => {
        if (target.classList.contains("delete")) {
          const ou = target.dataset.target;
          document.getElementById(ou).remove(ou);
          gallery.children.length === 1 && empty.classList.remove("hidden");
          delete FILES[ou];
        }
      };

      /**
       * #######################################
       * HANDLE CREATION OF CHARTS FEEDBACKS
       * #######################################
       */

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

      // Initialization of validation accuracy constant
      this.val_accuracy = document.getElementById("val_accuracy");

      // Initialization of the validation accuracy chart
      this.valAccuracyChart = new Chart(
        document.getElementById("valAccuracyChart"),
        {
          type: "line",
          data: {
            labels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            datasets: [
              {
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                backgroundColor: colors.primary,
                borderWidth: 0,
                categoryPercentage: 1,
              },
            ],
          },
          options: {
            scales: {
              yAxes: [
                {
                  display: false,
                  gridLines: false,
                  // uncomment to stop chart auto scale
                  /*
                    ticks: {
                        min:0,
                        max:100
                    }*/
                },
              ],
              xAxes: [
                {
                  display: false,
                  gridLines: false,
                },
              ],
              ticks: {
                padding: 10,
              },
            },
            cornerRadius: 2,
            maintainAspectRatio: false,
            legend: {
              display: false,
            },
            tooltips: {
              prefix: "Validation Accuracy",
              bodySpacing: 4,
              footerSpacing: 4,
              hasIndicator: true,
              mode: "index",
              intersect: true,
            },
            hover: {
              mode: "nearest",
              intersect: true,
            },
          },
        }
      );

      // Initialization of the training accuracy constant
      this.accuracy = document.getElementById("accuracy");

      // Initialization of the training accuracy chart
      this.accuracyChart = new Chart(document.getElementById("accuracyChart"), {
        type: "line",
        data: {
          labels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          datasets: [
            {
              data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              backgroundColor: colors.primary,
              borderWidth: 0,
              categoryPercentage: 1,
            },
          ],
        },
        options: {
          scales: {
            yAxes: [
              {
                display: false,
                gridLines: false,
                // uncomment to stop chart auto scale
                /*
                    ticks: {
                        min:0,
                        max:100
                    }*/
              },
            ],
            xAxes: [
              {
                display: false,
                gridLines: false,
              },
            ],
            ticks: {
              padding: 10,
            },
          },
          cornerRadius: 2,
          maintainAspectRatio: false,
          legend: {
            display: false,
          },
          tooltips: {
            prefix: "Validation Accuracy",
            bodySpacing: 4,
            footerSpacing: 4,
            hasIndicator: true,
            mode: "index",
            intersect: true,
          },
          hover: {
            mode: "nearest",
            intersect: true,
          },
        },
      });
    });
  },
  async unmounted() {
    if(peer != null) {
      peer.disconnect();
      peer.destroy();
    }  
  },
};
</script>

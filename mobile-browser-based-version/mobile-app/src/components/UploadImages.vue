<template>
  <div
    x-data="setup()"
    x-init="$refs.loading.classList.add('hidden'); setColors(color);"
    :class="{ dark: StateStore.isDark }"
  >
    <!-- Global Page Container-->
    <div
      class="flex h-screen antialiased text-gray-900 bg-gray-100 dark:bg-dark dark:text-light"
    >
      <!-- Loading screen -->
      <div
        v-if="loading"
        class="fixed inset-0 z-50 flex items-center justify-center text-2xl font-semibold text-white bg-primary-darker"
      >
        Loading.....
      </div>

      <!-- Sidebar -->
      <!-- Backdrop -->
      <div
        v-if="StateStore.isSidebarOpen"
        v-on:click="StateStore.isSidebarOpen = false"
        class="fixed inset-0 z-10 bg-primary-darker lg:hidden"
        style="opacity: 0.5"
        aria-hidden="true"
      ></div>
      <!-- Sidebar content -->
      <aside
        v-if="StateStore.isSidebarOpen"
        x-transition:enter="transition-all transform duration-300 ease-in-out"
        x-transition:enter-start="-translate-x-full opacity-0"
        x-transition:enter-end="translate-x-0 opacity-100"
        x-transition:leave="transition-all transform duration-300 ease-in-out"
        x-transition:leave-start="translate-x-0 opacity-100"
        x-transition:leave-end="-translate-x-full opacity-0"
        x-ref="sidebar"
        tabindex="-1"
        class="fixed inset-y-0 z-10 flex flex-shrink-0 overflow-hidden bg-white border-r lg:static dark:border-primary-darker dark:bg-darker focus:outline-none"
      >
        <mini-side-bar />
        <!-- Large Sidebar links -->
        <nav
          aria-label="Main"
          class="flex-1 w-64 px-2 py-4 space-y-2 overflow-y-hidden hover:overflow-y-auto"
        >
          <model-description-link />

          <upload-data-link />

          <statistics-link />
        </nav>
      </aside>

      <!-- Main Page -->
      <div class="flex flex-1 h-screen overflow-y-scroll">
        <main class="flex-1">
          <main-page-header />

          <!-- Main Page Content -->
          <div
            class="flex flex-col pt-4 items-right justify-start flex-1 h-full min-h-screen p-4 overflow-x-hidden overflow-y-auto"
          >
            <!-- Data Format Card -->
            <a id="overview-target">
              <div class="grid grid-cols-1 space-y-2 lg:gap-2">
                <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
                  <!-- Card header -->
                  <div
                    class="flex items-center justify-between p-4 border-b dark:border-primary"
                  >
                    <h4
                      class="text-lg font-semibold text-gray-500 dark:text-light"
                    >
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
                    <span class="text-sm text-gray-500 dark:text-light"
                      >Verum ad istam omnem orationem brevis est defensio. Nam
                      quoad aetas M. Caeli dare potuit isti suspicioni locum,
                      fuit primum ipsius pudore, deinde etiam patris diligentia
                      disciplinaque munita. Qui ut huic virilem togam
                      deditšnihil dicam hoc loco de me; tantum sit, quantum vos
                      existimatis; hoc dicam, hunc a patre continuo ad me esse
                      deductum; nemo hunc M. Caelium in illo aetatis flore vidit
                      nisi aut cum patre aut mecum aut in M. Crassi castissima
                      domo, cum artibus honestissimis erudiretur.</span
                    >
                  </div>
                </div>
              </div>
            </a>

            <!-- Data Example Card -->
            <a id="limitations-target">
              <div class="grid grid-cols-1 space-y-2 lg:gap-2">
                <!-- Limitations card -->
                <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
                  <!-- Card header -->
                  <div
                    class="flex items-center justify-between p-4 border-b dark:border-primary"
                  >
                    <h4
                      class="text-lg font-semibold text-gray-500 dark:text-light"
                    >
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
                    <span class="text-sm text-gray-500 dark:text-light"
                      >Verum ad istam omnem orationem brevis est defensio. Nam
                      quoad aetas M. Caeli dare potuit isti suspicioni locum,
                      fuit primum ipsius pudore, deinde etiam patris diligentia
                      disciplinaque munita. Qui ut huic virilem togam
                      deditšnihil dicam hoc loco de me; tantum sit, quantum vos
                      existimatis; hoc dicam, hunc a patre continuo ad me esse
                      deductum; nemo hunc M. Caelium in illo aetatis flore vidit
                      nisi aut cum patre aut mecum aut in M. Crassi castissima
                      domo, cum artibus honestissimis erudiretur.</span
                    >
                  </div>

                  <!-- Data Point Example -->
                  <a id="UploadMyData-target" />
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
                            A Long and Winding Tour of the History of UI
                            Frameworks and Tools and the Impact on Design
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
            <div class="grid grid-cols-1 space-y-2 lg:gap-2">
              <div class="container mx-width lg h-full">
                <!-- Card header -->
                <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
                  <div
                    class="flex items-center justify-between p-4 border-b dark:border-primary"
                  >
                    <h4
                      class="text-lg font-semibold text-gray-500 dark:text-light"
                    >
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

                <!-- Upload Images-->
                <div class="relative pb-4">
                  <image-upload-frame
                    v-for="label in task_labels"
                    v-bind:key="label"
                    :label="String(label)"
                    :inputchangefunc="inputChange"
                  />
                </div>
              </div>
            </div>

            <!-- Train Button -->
            <div class="flex items-center justify-center p-4">
              <button
                id="train-model-button"
                v-on:click="joinTraining"
                type="button"
                class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
              >
                Join Training
              </button>
            </div>

            <!-- Test Button -->
            <div class="flex items-center justify-center p-4">
              <a href="test-image.html">
                <button
                  href="test-image.html"
                  type="button"
                  class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
                >
                  Test
                </button>
              </a>
            </div>

            <!-- Training Board -->
             <div x-transition:enter="transition duration-300 ease-in-out" x-transition:enter-start="opacity-0"
               x-transition:enter-end="opacity-100" x-ref="trainingBoard" v-if="isTraining">

               <!-- Validation Accuracy users chart -->
               <div class="grid grid-cols-2 space-x-4 lg:gap-2">
                   <div class="col-span-1 bg-white rounded-md dark:bg-darker">
                     <!-- Card header -->
                     <div class="p-4 border-b dark:border-primary">
                       <h4 class="text-lg font-semibold text-gray-500 dark:text-light">Validation Accuracy of the Model</h4>
                     </div>
                     <p class="p-4">
                       <span class="text-2xl font-medium text-gray-500 dark:text-light" id="val_accuracy">0</span>
                       <span class="text-sm font-medium text-gray-500 dark:text-primary">% of validation accuracy</span>
                     </p>
                     <!-- Chart -->
                     <div class="relative p-4">
                       <canvas id="valAccuracyChart"></canvas>
                     </div>
                   </div>

                   <div class="col-span-1 bg-white rounded-md dark:bg-darker">
                     <!-- Card header -->
                     <div class="p-4 border-b dark:border-primary">
                       <h4 class="text-lg font-semibold text-gray-500 dark:text-light">Training Accuracy of the Model</h4>
                     </div>
                     <p class="p-4">
                       <span class="text-2xl font-medium text-gray-500 dark:text-light" id="accuracy">0</span>
                       <span class="text-sm font-medium text-gray-500 dark:text-primary">% of training accuracy</span>
                     </p>
                     <!-- Chart -->
                     <div class="relative p-4">
                       <canvas id="accuracyChart"></canvas>
                     </div>
                   </div>
               </div>
             </div>


          </div>

          <!-- TO DO: wrong behavour, need to be able to appear again-->
          <!-- Alert Pannel -->
          <div class="alert-banner w-full fixed top-0" v-if="isAlertOpen">
            <input type="checkbox" class="hidden" id="banneralert" />

            <label
              class="close cursor-pointer flex items-center justify-between w-full p-2 bg-red-500 shadow text-white"
              title="close"
              for="banneralert"
            >
              Nothing Is Wired (click anywhere to close)

              <svg
                class="fill-current text-white"
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 18 18"
              >
                <path
                  d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"
                ></path>
              </svg>
            </label>
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
    </div>
  </div>

  <!-- Panels -->
  <!-- Settings Panel -->
  <!-- Backdrop -->
  <div
    x-transition:enter="transition duration-300 ease-in-out"
    x-transition:enter-start="opacity-0"
    x-transition:enter-end="opacity-100"
    x-transition:leave="transition duration-300 ease-in-out"
    x-transition:leave-start="opacity-100"
    x-transition:leave-end="opacity-0"
    v-if="StateStore.isSettingsPanelOpen"
    v-on:click="StateStore.isSettingsPanelOpen = false"
    class="fixed inset-0 z-10 bg-primary-darker"
    style="opacity: 0.5"
    aria-hidden="true"
  ></div>
  <!-- Panel -->
  <section
    x-transition:enter="transition duration-300 ease-in-out transform sm:duration-500"
    x-transition:enter-start="translate-x-full"
    x-transition:enter-end="translate-x-0"
    x-transition:leave="transition duration-300 ease-in-out transform sm:duration-500"
    x-transition:leave-start="translate-x-0"
    x-transition:leave-end="translate-x-full"
    x-ref="settingsPanel"
    tabindex="-1"
    v-if="StateStore.isSettingsPanelOpen"
    v-on:keydown.escape="StateStore.isSettingsPanelOpen = false"
    class="fixed inset-y-0 right-0 z-20 w-full max-w-xs bg-white shadow-xl dark:bg-darker dark:text-light sm:max-w-md focus:outline-none"
    aria-labelledby="settinsPanelLabel"
  >
    <div class="absolute left-0 p-2 transform -translate-x-full">
      <!-- Close button -->
      <button
        v-on:click="StateStore.isSettingsPanelOpen = false"
        class="p-2 text-white rounded-md focus:outline-none focus:ring"
      >
        <svg
          class="w-5 h-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
    <!-- Panel content -->
    <div class="flex flex-col h-screen">
      <!-- Panel header -->
      <div
        class="flex flex-col items-center justify-center flex-shrink-0 px-4 py-8 space-y-4 border-b dark:border-primary-dark"
      >
        <span aria-hidden="true" class="text-gray-500 dark:text-primary">
          <svg
            class="w-8 h-8"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        </span>
        <h2
          id="settinsPanelLabel"
          class="text-xl font-medium text-gray-500 dark:text-light"
        >
          Settings
        </h2>
      </div>
      <!-- Content -->
      <div class="flex-1 overflow-hidden hover:overflow-y-auto">
        <!-- Theme -->
        <div class="p-4 space-y-4 md:p-8">
          <h6 class="text-lg font-medium text-gray-400 dark:text-light">
            Mode
          </h6>
          <div class="flex items-center space-x-8">
            <!-- Light button -->
            <button
              v-on:click="setLightTheme"
              class="flex items-center justify-center px-4 py-2 space-x-4 transition-colors border rounded-md hover:text-gray-900 hover:border-gray-900 dark:border-primary dark:hover:text-primary-100 dark:hover:border-primary-light focus:outline-none focus:ring focus:ring-primary-lighter focus:ring-offset-2 dark:focus:ring-offset-dark dark:focus:ring-primary-dark"
              :class="{
                'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100': !StateStore.isDark,
                'text-gray-500 dark:text-primary-light': StateStore.isDark,
              }"
            >
              <span>
                <svg
                  class="w-6 h-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </span>
              <span>Light</span>
            </button>

            <!-- Dark button -->
            <button
              v-on:click="setDarkTheme"
              class="flex items-center justify-center px-4 py-2 space-x-4 transition-colors border rounded-md hover:text-gray-900 hover:border-gray-900 dark:border-primary dark:hover:text-primary-100 dark:hover:border-primary-light focus:outline-none focus:ring focus:ring-primary-lighter focus:ring-offset-2 dark:focus:ring-offset-dark dark:focus:ring-primary-dark"
              :class="{
                'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100':
                  StateStore.isDark,
                'text-gray-500 dark:text-primary-light': !StateStore.isDark,
              }"
            >
              <span>
                <svg
                  class="w-6 h-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              </span>
              <span>Dark</span>
            </button>
          </div>
        </div>

        <!-- Colors -->
        <div class="p-4 space-y-4 md:p-8">
          <h6 class="text-lg font-medium text-gray-400 dark:text-light">
            Colors
          </h6>
          <div>
            <button
              v-on:click="setColors('cyan')"
              class="w-10 h-10 rounded-full"
              style="background-color: var(--color-cyan)"
            ></button>
            <button
              v-on:click="setColors('teal')"
              class="w-10 h-10 rounded-full"
              style="background-color: var(--color-teal)"
            ></button>
            <button
              v-on:click="setColors('green')"
              class="w-10 h-10 rounded-full"
              style="background-color: var(--color-green)"
            ></button>
            <button
              v-on:click="setColors('fuchsia')"
              class="w-10 h-10 rounded-full"
              style="background-color: var(--color-fuchsia)"
            ></button>
            <button
              v-on:click="setColors('blue')"
              class="w-10 h-10 rounded-full"
              style="background-color: var(--color-blue)"
            ></button>
            <button
              v-on:click="setColors('violet')"
              class="w-10 h-10 rounded-full"
              style="background-color: var(--color-violet)"
            ></button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Search panel -->
  <!-- Backdrop -->
  <div
    x-transition:enter="transition duration-300 ease-in-out"
    x-transition:enter-start="opacity-0"
    x-transition:enter-end="opacity-100"
    x-transition:leave="transition duration-300 ease-in-out"
    x-transition:leave-start="opacity-100"
    x-transition:leave-end="opacity-0"
    v-if="StateStore.isSearchPanelOpen"
    v-on:click="StateStore.isSearchPanelOpen = false"
    class="fixed inset-0 z-10 bg-primary-darker"
    style="opacity: 0.5"
    aria-hidden="ture"
  ></div>
  <!-- Panel -->
  <section
    x-transition:enter="transition duration-300 ease-in-out transform sm:duration-500"
    x-transition:enter-start="-translate-x-full"
    x-transition:enter-end="translate-x-0"
    x-transition:leave="transition duration-300 ease-in-out transform sm:duration-500"
    x-transition:leave-start="translate-x-0"
    x-transition:leave-end="-translate-x-full"
    v-if="StateStore.isSearchPanelOpen"
    v-on:keydown.escape="StateStore.isSearchPanelOpen = false"
    class="fixed inset-y-0 z-20 w-full max-w-xs bg-white shadow-xl dark:bg-darker dark:text-light sm:max-w-md focus:outline-none"
  >
    <div class="absolute right-0 p-2 transform translate-x-full">
      <!-- Close button -->
      <button
        v-on:click="StateStore.isSearchPanelOpen = false"
        class="p-2 text-white rounded-md focus:outline-none focus:ring"
      >
        <svg
          class="w-5 h-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <h2 class="sr-only">Search panel</h2>
    <!-- Panel content -->
    <div class="flex flex-col h-screen">
      <!-- Panel header (Search input) -->
      <div
        class="relative flex-shrink-0 px-4 py-8 text-gray-400 border-b dark:border-primary-darker dark:focus-within:text-light focus-within:text-gray-700"
      >
        <span class="absolute inset-y-0 inline-flex items-center px-4">
          <svg
            class="w-5 h-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
        <input
          x-ref="searchInput"
          type="text"
          class="w-full py-2 pl-10 pr-4 border rounded-full dark:bg-dark dark:border-transparent dark:text-light focus:outline-none focus:ring"
          placeholder="Search..."
        />
      </div>

      <!-- Panel content (Search result) -->
      <div
        class="flex-1 px-4 pb-4 space-y-4 overflow-y-hidden h hover:overflow-y-auto"
      >
        <h3 class="py-2 text-sm font-semibold text-gray-600 dark:text-light">
          History
        </h3>
        <p class="px=4">Search resault</p>
        <!--  -->
        <!-- Search content -->
        <!--  -->
      </div>
    </div>
  </section>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}

/*Banner open/load animation*/

.alert-banner {
  -webkit-animation: slide-in-top 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  animation: slide-in-top 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/*Banner close animation*/

.alert-banner input:checked ~ * {
  -webkit-animation: slide-out-top 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53)
    both;
  animation: slide-out-top 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53) both;
}

@-webkit-keyframes slide-in-top {
  0% {
    -webkit-transform: translateY(-1000px);
    transform: translateY(-1000px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateY(0);
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slide-in-top {
  0% {
    -webkit-transform: translateY(-1000px);
    transform: translateY(-1000px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateY(0);
    transform: translateY(0);
    opacity: 1;
  }
}

@-webkit-keyframes slide-out-top {
  0% {
    -webkit-transform: translateY(0);
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    -webkit-transform: translateY(-1000px);
    transform: translateY(-1000px);
    opacity: 0;
  }
}

@keyframes slide-out-top {
  0% {
    -webkit-transform: translateY(0);
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    -webkit-transform: translateY(-1000px);
    transform: translateY(-1000px);
    opacity: 0;
  }
}

@-webkit-keyframes slide-in-bottom {
  0% {
    -webkit-transform: translateY(1000px);
    transform: translateY(1000px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateY(0);
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slide-in-bottom {
  0% {
    -webkit-transform: translateY(1000px);
    transform: translateY(1000px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateY(0);
    transform: translateY(0);
    opacity: 1;
  }
}

@-webkit-keyframes slide-out-bottom {
  0% {
    -webkit-transform: translateY(0);
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    -webkit-transform: translateY(1000px);
    transform: translateY(1000px);
    opacity: 0;
  }
}

@keyframes slide-out-bottom {
  0% {
    -webkit-transform: translateY(0);
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    -webkit-transform: translateY(1000px);
    transform: translateY(1000px);
    opacity: 0;
  }
}

@-webkit-keyframes slide-in-right {
  0% {
    -webkit-transform: translateX(1000px);
    transform: translateX(1000px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateX(0);
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-in-right {
  0% {
    -webkit-transform: translateX(1000px);
    transform: translateX(1000px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateX(0);
    transform: translateX(0);
    opacity: 1;
  }
}

@-webkit-keyframes fade-out-right {
  0% {
    -webkit-transform: translateX(0);
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    -webkit-transform: translateX(50px);
    transform: translateX(50px);
    opacity: 0;
  }
}

@keyframes fade-out-right {
  0% {
    -webkit-transform: translateX(0);
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    -webkit-transform: translateX(50px);
    transform: translateX(50px);
    opacity: 0;
  }
}
</style>


<script>
import * as tf from "@tensorflow/tfjs";
import helperJoinTraining from '../helpers/image-upload-helper'
import TaskStore from "../store/taskStore";
import ImageStore from "../store/imageStore";
import StateStore from "../store/stateStore";
import StatisticsLink from "./StatisticsLink";
import ModelDescriptionLink from "./ModelDescriptionLink";
import UploadDataLink from "./UploadDataLink";
import MiniSideBar from "./MiniSideBar";
import MainPageHeader from "./MainPageHeader";
import ImageUploadFrame from "./ImageUploadFrame";
export default {
  name: "UseImageModel",
  props: {
    msg: String,
  },
  components: {
    StatisticsLink,
    ModelDescriptionLink,
    UploadDataLink,
    MiniSideBar,
    MainPageHeader,
    ImageUploadFrame,
  },
  data() {
    return {
      predictedValue: "Click on test!",
      TaskStore: TaskStore.data,
      ImageStore: ImageStore.data,
      tensorflowModel: null,
      isAlertOpen: false,
      StateStore: StateStore.data,
      isNotificationsPanelOpen: false,
      loading: false,
      selectedColor: "cyan",
      isActive: false,
      open: false,
      image_uploaded: false,
      uploaded_file_info: null,
      FILES: {},
      task_labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      isTraining: false
    };
  },
  mounted() {
    StateStore.isDark = this.getTheme()
    StateStore.color = this.getColor()
  },
  methods: {
    addFile: function (target, file, label) {
      const isImage = file.type.match("image.*"),
        objectURL = URL.createObjectURL(file);
      this.FILES[objectURL] = label;
    },
    inputChange: function (e, label) {
      for (const file of e.target.files) {
        console.log("Adding file");
        this.addFile(gallery, file, label);
        console.log("File Added");
      }
    },
    joinTraining: function () {
      console.log("Join Training");
      this.isTraining = true
      helperJoinTraining(this.FILES);
    },
  watchScreen: function() {
    if (window.innerWidth <= 1024) {
      this.StateStore.isSidebarOpen = false;
    } else if (window.innerWidth >= 1024) {
      this.StateStore.isSidebarOpen = true;
    }
  },
  toggleSidbarMenu: function()  {
    this.StateStore.isSidebarOpen = !this.State.Store.isSidebarOpen;
  },
  openNotificationsPanel: function()  {
    this.isNotificationsPanelOpen = true;
    this.$nextTick(() => {
      this.$refs.notificationsPanel.focus();
    });
  },
  openAlert: function()  {
    this.isAlertOpen = true;
    this.$nextTick(() => {
      this.$refs.alert.focus();
    });
  },
  setColors: function(color)  {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", `var(--color-${color})`);
    root.style.setProperty("--color-primary-50", `var(--color-${color}-50)`);
    root.style.setProperty("--color-primary-100", `var(--color-${color}-100)`);
    root.style.setProperty(
      "--color-primary-light",
      `var(--color-${color}-light)`
    );
    root.style.setProperty(
      "--color-primary-lighter",
      `var(--color-${color}-lighter)`
    );
    root.style.setProperty(
      "--color-primary-dark",
      `var(--color-${color}-dark)`
    );
    root.style.setProperty(
      "--color-primary-darker",
      `var(--color-${color}-darker)`
    );
    this.selectedColor = color;
    window.localStorage.setItem("color", color);
  },
  getTheme: function()  {
    if (window.localStorage.getItem("dark")) {
      return JSON.parse(window.localStorage.getItem("dark"));
    }
    return (
      !!window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    )
  },
  getColor: function()  {
    if (window.localStorage.getItem("color")) {
      return window.localStorage.getItem("color");
    }
    return "cyan";
  },
  testButtonOnClickHandler: function()  {
    const filesElement = document.getElementById("hidden-input");

    let file = filesElement.files[0];

    // Only process image files (skip non image files)
    if (file && file.type.match("image.*")) {
      let reader = new FileReader();
      reader.onload = (e) => {
        // Fill the image & call predict.
        let img = document.createElement("img");
        img.src = e.target.result;
        img.width = IMAGE_SIZE;
        img.height = IMAGE_SIZE;
        img.onload = () => predict(img);
      };

      // Read in the image file as a data URL.
      reader.readAsDataURL(file);
    }
  },
  onClickHandler(ev) {
    document.getElementById("hidden-input").click();
  },
  onChangeInput(e) {
    for (const file of e.target.files) {
      this.addFile(gallery, file);
    }
  },
  dropHandler(ev) {
    ev.preventDefault();
    for (const file of ev.dataTransfer.files) {
      this.addFile(gallery, file);
      overlay.classList.remove("draggedover");
      counter = 0;
    }
  },
  
  myEventHandler(e) {
    this.StateStore.isSidebarOpen = window.innerWidth > 1024;
  },
  },
  created() {
    window.addEventListener("resize", this.myEventHandler);
  },
  unmounted() {
    window.removeEventListener("resize", this.myEventHandler);
  },
  
};

function _parse_function(filename) {
  const image_string = tf.io.read_file(filename);
  const image_decoded = tf.image.decode_jpeg(image_string, 3);
  const image = tf.cast(image_decoded, tf.io.float32);
  return image;
}

//<!-- To do: needs to be connected to outer JS with Vue -->
//<!-- Script for Data Upload -->

// use to store pre selected files
let FILES = {};

// check if file is of type image and prepend the initialied
// template to the target element

const gallery = document.getElementById("gallery"),
  overlay = document.getElementById("overlay");

// click the hidden input of type file if the visible button is clicked
// and capture the selected files
// const hidden = document.getElementById("hidden-input");
// document.getElementById("button").onclick = () => hidden.click();
// hidden.onchange = (e) => {
//   for (const file of e.target.files) {
//     addFile(gallery, file);
//   }
// };

// use to check if a file is being dragged
const hasFiles = ({ dataTransfer: { types = [] } }) =>
  types.indexOf("Files") > -1;

// use to drag dragenter and dragleave events.
// this is to know if the outermost parent is dragged over
// without issues due to drag events on its children
let counter = 0;

// reset counter and append file to gallery when file is dropped

function onClickHandler(ev) {
  document.getElementById("hidden-input").click();
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
// gallery.onclick = ({ target }) => {
//   if (target.classList.contains("delete")) {
//     const ou = target.dataset.target;
//     document.getElementById(ou).remove(ou);
//     gallery.children.length === 1 && empty.classList.remove("hidden");
//     delete FILES[ou];
//   }
// };

function status(msg) {
  const demoStatusElement = document.getElementById("status");
  demoStatusElement.innerText = msg;
}
const MOBILENET_MODEL_PATH =
  // tslint:disable-next-line:max-line-length
  "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json";

const TOPK_PREDICTIONS = 10;
const IMAGE_SIZE = 224;

let mobilenet;
const mobilenetDemo = async () => {
  // status('Loading model...');

  mobilenet = await tf.loadLayersModel(MOBILENET_MODEL_PATH);

  // Warmup the model. This isn't necessary, but makes the first prediction
  // faster. Call `dispose` to release the WebGL memory allocated for the return
  // value of `predict`.
  mobilenet.predict(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3])).dispose();

  //status('');
};

/**
 * Given an image element, makes a prediction through mobilenet returning the
 * probabilities of the top K classes.
 */
async function predict(imgElement) {
  status("Predicting...");

  // The first start time includes the time it takes to extract the image
  // from the HTML and preprocess it, in additon to the predict() call.
  const startTime1 = performance.now();
  // The second start time excludes the extraction and preprocessing and
  // includes only the predict() call.
  let startTime2;
  const logits = tf.tidy(() => {
    // tf.browser.fromPixels() returns a Tensor from an image element.
    const img = tf.browser.fromPixels(imgElement).toFloat();

    const offset = tf.scalar(127.5);
    // Normalize the image from [0, 255] to [-1, 1].
    const normalized = img.sub(offset).div(offset);

    // Reshape to a single-element batch so we can pass it to predict.
    const batched = normalized.reshape([1, IMAGE_SIZE, IMAGE_SIZE, 3]);

    startTime2 = performance.now();
    // Make a prediction through mobilenet.
    return mobilenet.predict(batched);
  });

  // Convert logits to probabilities and class names.
  // Convert logits to probabilities and class names.
  const classes = await getTopKClasses(logits, TOPK_PREDICTIONS);
  const totalTime1 = performance.now() - startTime1;
  const totalTime2 = performance.now() - startTime2;
  status(
    `Done in ${Math.floor(totalTime1)} ms ` +
      `(not including preprocessing: ${Math.floor(totalTime2)} ms)`
  );

  console.log(classes);
  // Show the classes in the DOM.
  showResults(imgElement, classes);
}

/**
 * Computes the probabilities of the topK classes given logits by computing
 * softmax to get probabilities and then sorting the probabilities.
 * @param logits Tensor representing the logits from MobileNet.
 * @param topK The number of top predictions to show.
 */
async function getTopKClasses(logits, topK) {
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
}

//
// UI
//

function showResults(imgElement, classes) {
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
}

function testButtonOnClickHandler() {
  const filesElement = document.getElementById("hidden-input");

  let file = filesElement.files[0];

  // Only process image files (skip non image files)
  if (file && file.type.match("image.*")) {
    let reader = new FileReader();
    reader.onload = (e) => {
      // Fill the image & call predict.
      let img = document.createElement("img");
      img.src = e.target.result;
      img.width = IMAGE_SIZE;
      img.height = IMAGE_SIZE;
      img.onload = () => predict(img);
    };

    // Read in the image file as a data URL.
    reader.readAsDataURL(file);
  }
}

const predictionsElement = document.getElementById("predictions");

mobilenetDemo();

const IMAGENET_CLASSES = {
  0: "tench, Tinca tinca",
};
</script>
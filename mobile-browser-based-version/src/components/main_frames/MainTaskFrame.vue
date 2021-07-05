<template>
  <div>
    <div
      v-if="'password_hash' in this.Task.displayInformation && !authenticated"
      class="flex h-screen"
    >
      <div class="m-auto">
        <div class="mb-6 space-y-4">
          <label class="flex justify-center" for="password">
            Joining this task is password restricted
          </label>
          <input
              type="password"
              v-model="inputPassword"
              placeholder="Enter password"
              class="border text-lg ml-3 py-2 px-4 placeholder-gray-400 text-gray-700 dark:text-white relative bg-white dark:bg-dark rounded text-sm shadow outline-none focus:outline-none focus:shadow-outline"
              v-bind:class="{ 'border-red-500': incorrectLogin }"
            />
            <button
              v-on:click="login()"
              type="button"
              class="text-lg border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
            >
              Login
            </button>
            <p :style="{visibility: incorrectLogin ? 'visible' : 'hidden'}" class="text-red-500 text-xs flex justify-center">Incorrect password.</p>
        </div>
      </div>
    </div>
    <div v-else>
    <header
      class="p-1 flex items-center justify-between p-2 bg-white border-b dark:bg-darker dark:border-primary-darker"
    >
      <div class="flex items-center md:space-x-0">
        <!-- Sidebar button (for small screens) -->
        <button
          v-on:click="isSidebarOpen = !isSidebarOpen"
          class="rounded-md text-primary-lighter bg-primary-50 dark:bg-primary-darker dark:text-white"
        >
          <span class="sr-only">Open main manu</span>
          <span aria-hidden="true">
            <svg
              v-show="!isSidebarOpen && window.width <= 1024"
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <svg
              v-show="isSidebarOpen && window.width <= 1024"
              class="w-8 h-8"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </span>
        </button>
        <div class="p-1"></div>
        <h1 class="text-2xl font-medium">{{ TaskTitle }} Model</h1>
      </div>
    </header>
    <div
      class="flex h-screen antialiased text-gray-900 bg-gray-100 dark:bg-dark dark:text-light"
    >
      <!-- Sidebar content -->
      <aside
        v-show="isSidebarOpen"
        tabindex="-1"
        class="fixed inset-y-1 z-10 flex flex-shrink-0 h-full overflow-hidden bg-white border-r lg:static dark:border-primary-darker dark:bg-darker"
      >
        <div class="flex flex-col flex-shrink-0 h-full">
          <nav
            aria-label="Main"
            class="flex-1 w-64 px-2 py-4 space-y-2 overflow-y-hidden hover:overflow-y-auto"
          >
            <!-- Model Description links -->
            <div>
              <!-- active & hover classes 'bg-primary-100 dark:bg-primary' -->
              <a
                v-on:click="openModelDesc = !openModelDesc"
                class="flex items-center p-2 text-gray-500 transition-colors rounded-md dark:text-light hover:bg-primary-100 dark:hover:bg-primary"
                :class="{
                  'bg-primary-100 dark:bg-primary':
                    isActiveModelDesc || openModelDesc,
                }"
                role="button"
                aria-haspopup="true"
                :aria-expanded="
                  openModelDesc || isActiveModelDesc ? 'true' : 'false'
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  class="bi bi-card-heading w-5 h-h"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"
                  />
                  <path
                    d="M3 8.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5zm0-5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-1z"
                  />
                </svg>
                <span class="ml-2 text-sm">
                  {{ TaskTitle }} Task Information
                </span>
                <span class="ml-auto" aria-hidden="true">
                  <!-- active class 'rotate-180' -->
                  <svg
                    class="w-4 h-4 transition-transform transform"
                    :class="{ 'rotate-180': openModelDesc }"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </a>
              <div
                role="menu"
                v-show="openModelDesc"
                class="mt-2 space-y-2 px-7"
                aria-label="Dashboards"
              >
                <!-- active & hover classes 'text-gray-700 dark:text-light' -->
                <!-- inActive classes 'text-gray-400 dark:text-gray-400' -->
                <a
                  v-on:click="goToModelDescription()"
                  role="menuitem"
                  class="block p-2 text-sm text-gray-400 transition-colors duration-200 rounded-md dark:text-gray-400 dark:hover:text-light hover:text-gray-700"
                >
                  Overview
                </a>
                <a
                  v-on:click="goToModelDescription()"
                  role="menuitem"
                  class="block p-2 text-sm text-gray-400 transition-colors duration-200 rounded-md dark:hover:text-light hover:text-gray-700"
                >
                  Limitations
                </a>
                <a
                  v-on:click="goToModelDescription()"
                  role="menuitem"
                  class="block p-2 text-sm text-gray-400 transition-colors duration-200 rounded-md dark:hover:text-light hover:text-gray-700"
                >
                  Trade-offs
                </a>
              </div>
            </div>

            <!-- Upload Data links -->
            <div>
              <!-- active classes 'bg-primary-100 dark:bg-primary' -->
              <a
                href="#"
                v-on:click="
                  $event.preventDefault();
                  openUploadData = !openUploadData;
                "
                class="flex items-center p-2 text-gray-500 transition-colors rounded-md dark:text-light hover:bg-primary-100 dark:hover:bg-primary"
                :class="{
                  'bg-primary-100 dark:bg-primary':
                    isActiveUploadData || openUploadData,
                }"
                role="button"
                aria-haspopup="true"
                :aria-expanded="
                  openUploadData || isActiveUploadData ? 'true' : 'false'
                "
              >
                <span aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    class="bi bi-box-arrow-up w-5 h-5"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M3.5 6a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 1 0-1h2A1.5 1.5 0 0 1 14 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-8A1.5 1.5 0 0 1 3.5 5h2a.5.5 0 0 1 0 1h-2z"
                    />
                    <path
                      fill-rule="evenodd"
                      d="M7.646.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 1.707V10.5a.5.5 0 0 1-1 0V1.707L5.354 3.854a.5.5 0 1 1-.708-.708l3-3z"
                    />
                  </svg>
                </span>
                <span class="ml-2 text-sm"> Upload Data </span>
                <span aria-hidden="true" class="ml-auto">
                  <!-- active class 'rotate-180' -->
                  <svg
                    class="w-4 h-4 transition-transform transform"
                    :class="{ 'rotate-180': openUploadData }"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </a>
              <div
                v-show="openUploadData"
                class="mt-2 space-y-2 px-7"
                role="menu"
                arial-label="Components"
              >
                <!-- active & hover classes 'text-gray-700 dark:text-light' -->
                <!-- inActive classes 'text-gray-400 dark:text-gray-400' -->
                <a
                  v-on:click="goToTraining()"
                  role="menuitem"
                  class="block p-2 text-sm text-gray-400 transition-colors duration-200 rounded-md dark:text-gray-400 dark:hover:text-light hover:text-gray-700"
                >
                  Data Format Information
                </a>
                <a
                  v-on:click="goToTraining()"
                  role="menuitem"
                  class="block p-2 text-sm text-gray-400 transition-colors duration-200 rounded-md dark:text-gray-400 dark:hover:text-light hover:text-gray-700"
                >
                  Upload My Data
                </a>
              </div>
            </div>

            <!-- Statistics links -->
            <div>
              <!-- active classes 'bg-primary-100 dark:bg-primary' -->
              <a
                href="#"
                v-on:click="
                  $event.preventDefault();
                  openModelStatistic = !openModelStatistic;
                "
                class="flex items-center p-2 text-gray-500 transition-colors rounded-md dark:text-light hover:bg-primary-100 dark:hover:bg-primary"
                :class="{
                  'bg-primary-100 dark:bg-primary':
                    isActiveModelStatistic || openModelStatistic,
                }"
                role="button"
                aria-haspopup="true"
                :aria-expanded="
                  openModelStatistic || isActiveModelStatistic
                    ? 'true'
                    : 'false'
                "
              >
                <span aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    class="bi bi-graph-up w-5 h-5"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M0 0h1v15h15v1H0V0zm10 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V4.9l-3.613 4.417a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61L13.445 4H10.5a.5.5 0 0 1-.5-.5z"
                    />
                  </svg>
                </span>
                <span class="ml-2 text-sm"> Model Statistics </span>
                <span aria-hidden="true" class="ml-auto">
                  <!-- active class 'rotate-180' -->
                  <svg
                    class="w-4 h-4 transition-transform transform"
                    :class="{ 'rotate-180': openModelStatistic }"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </a>
              <div
                v-show="openModelStatistic"
                class="mt-2 space-y-2 px-7"
                role="menu"
                arial-label="Pages"
              >
                <!-- active & hover classes 'text-gray-700 dark:text-light' -->
                <!-- inActive classes 'text-gray-400 dark:text-gray-400' -->
                <a
                  href="#"
                  role="menuitem"
                  class="block p-2 text-sm text-gray-400 transition-colors duration-200 rounded-md dark:text-gray-400 dark:hover:text-light hover:text-gray-700"
                >
                  Blank
                </a>
                <a
                  href="#"
                  role="menuitem"
                  class="block p-2 text-sm text-gray-400 transition-colors duration-200 rounded-md dark:text-gray-400 dark:hover:text-light hover:text-gray-700"
                >
                  Blank
                </a>
              </div>
            </div>
          </nav>
        </div>
      </aside>

      <div class="flex flex-1 h-screen overflow-y-scroll overflow-x-scroll" v-if="TaskTitle" >
        <main class="flex-1 overflow-y-scroll" >
          <router-view v-slot="{ Component }" >
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </main>
      </div>
    </div>
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
    </div>
  </div>
</template>

<script>
var Hashes = require('jshashes')
export default {
  name: "MainTaskFrame",
  props: {
      Id: String,
      Task: Object,
  },
  data() {
    return {
      TaskTitle: null,
      isActiveModelDesc: false,
      openModelDesc: false,
      isActiveUploadData: false,
      openUploadData: false,
      isActiveModelStatistic: false,
      openModelStatistic: false,
      isSidebarOpen: window.innerWidth <= 1024 ? false : true,
      window: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      authenticated: false,
      inputPassword: '',
      incorrectLogin: false,
    };
  },
  methods: {
    goToTraining() {
      this.$router.push({ 
          name: this.Task.trainingInformation.modelId + '.training',
          params: {Id: this.Task.trainingInformation.modelId }
       });
    },
    goToModelDescription() {
      this.$router.push({ 
          path: 'description',
       });
    },
    async handleResize() {
      this.window.width = window.innerWidth;
      this.window.height = window.innerHeight;
      if (this.window.width <= 1024) {
        this.isSidebarOpen = false;
      } else {
        this.isSidebarOpen = true;
      }
    },
    login() {
      var SHA256 =  new Hashes.SHA256()
      if (SHA256.hex(this.inputPassword) === this.Task.displayInformation.password_hash) {
        this.authenticated = true
        this.$store.commit('addPassword', {'id': this.Id, 'password': this.inputPassword}) 
      }
      else {
        this.incorrectLogin = true
      }
    }
  },
  async mounted() {
    this.TaskTitle = this.Task.displayInformation.taskTitle
    window.addEventListener("resize", this.handleResize);
  },

  activated() {
    this.TaskTitle = this.Task.displayInformation.taskTitle
    let prevState = this.$store.getters.globalTaskFrameState(this.Task.trainingInformation.modelId)
    
    if (prevState) {
      // if previous state exist, load it 
      this.isActiveModelDesc = prevState.isActiveModelDesc
      this.openModelDesc = prevState.openModelDesc
      this.isActiveUploadData = prevState.isActiveUploadData
      this.openUploadData = prevState.openUploadData
      this.isActiveModelStatistic = prevState.isActiveModelStatistic
      this.openModelStatistic = prevState.openModelStatistic
      this.isSidebarOpen = prevState.isSidebarOpen
    } else {
      // if previous state does not exist, initilize variable to initial values
      this.isActiveModelDesc =  false
      this.openModelDesc = false
      this.isActiveUploadData =  false
      this.openUploadData =  false
      this.isActiveModelStatistic = false
      this.openModelStatistic = false
      this.isSidebarOpen =  window.innerWidth <= 1024 ? false : true
    }
  },
  async deactivated() {
    let currentState = {
        modelId: this.Task.trainingInformation.modelId,
        isActiveModelDesc: this.isActiveModelDesc,
        openModelDesc: this.openModelDesc,
        isActiveUploadData: this.isActiveUploadData,
        openUploadData: this.openUploadData,
        isActiveModelStatistic: this.isActiveModelStatistic,
        openModelStatistic: this.openModelStatistic,
        isSidebarOpen: this.isSidebarOpen
    }
    await this.$store.commit('addGlobalTaskFrameState', currentState)
  },
  unmounted() {
    window.removeEventListener("resize", this.handleResize);
  },
};
</script>
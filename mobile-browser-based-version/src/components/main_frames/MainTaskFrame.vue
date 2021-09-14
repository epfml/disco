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
          <p
            :style="{ visibility: incorrectLogin ? 'visible' : 'hidden' }"
            class="text-red-500 text-xs flex justify-center"
          >
            Incorrect password.
          </p>
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
                  v-on:click="
                    $event.preventDefault();
                    openSidebarMenu('model_desc');
                    goToModelDescription();
                  "
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
                    Overview
                  </span>
                </a>
              </div>

              <!-- Upload Data links -->
              <div>
                <!-- active classes 'bg-primary-100 dark:bg-primary' -->
                <a
                  href="#"
                  v-on:click="
                    $event.preventDefault();
                    openSidebarMenu('upload_data');
                    goToTraining();
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
                      class="h-h w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                      />
                    </svg>
                  </span>
                  <span class="ml-2 text-sm"> Choose your data </span>
                </a>
              </div>

              <!-- Statistics links -->
              <div>
                <!-- active classes 'bg-primary-100 dark:bg-primary' -->
                <a
                  href="#"
                  v-on:click="
                    $event.preventDefault();
                    openSidebarMenu('model_statistic');
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
                </a>
              </div>

              <!-- Test Model -->
              <div>
                <!-- active classes 'bg-primary-100 dark:bg-primary' -->
                <a
                  href="#"
                  v-on:click="
                    $event.preventDefault();
                    openSidebarMenu('test_model');
                    goToTesting();
                  "
                  class="flex items-center p-2 text-gray-500 transition-colors rounded-md dark:text-light hover:bg-primary-100 dark:hover:bg-primary"
                  :class="{
                    'bg-primary-100 dark:bg-primary':
                      isActiveTestModel || openTestModel,
                  }"
                  role="button"
                  aria-haspopup="true"
                  :aria-expanded="
                    isActiveTestModel || openTestModel ? 'true' : 'false'
                  "
                >
                  <span aria-hidden="true">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                      />
                    </svg>
                  </span>
                  <span class="ml-2 text-sm"> Test your model </span>
                </a>
              </div>
            </nav>
          </div>
        </aside>

        <div
          class="flex flex-1 h-screen overflow-y-scroll overflow-x-scroll"
          v-if="TaskTitle"
        >
          <main class="flex-1 overflow-y-scroll">
            <router-view
              v-on:opened-testing="
                this.TaskTitle = this.Task.displayInformation.taskTitle;
                openSidebarMenu('test_model');
              "
              v-slot="{ Component }"
            >
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
var Hashes = require('jshashes');
export default {
  name: 'MainTaskFrame',
  props: {
    Id: String,
    Task: Object,
  },
  data() {
    return {
      TaskTitle: null,
      isActiveModelDesc: false,
      openModelDesc: true,
      isActiveUploadData: false,
      isActiveTestModel: false,
      openUploadData: false,
      openTestModel: false,
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
        params: { Id: this.Task.trainingInformation.modelId },
      });
    },
    goToTesting() {
      this.$router.push({
        name: this.Task.trainingInformation.modelId + '.testing',
        params: { Id: this.Task.trainingInformation.modelId },
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
      var SHA256 = new Hashes.SHA256();
      if (
        SHA256.hex(this.inputPassword) ===
        this.Task.displayInformation.password_hash
      ) {
        this.authenticated = true;
        this.$store.commit('addPassword', {
          id: this.Id,
          password: this.inputPassword,
        });
      } else {
        this.incorrectLogin = true;
      }
    },
    openSidebarMenu(menu) {
      this.openModelDesc = menu === 'model_desc' ? true : false;
      this.openUploadData = menu === 'upload_data' ? true : false;
      this.openModelStatistic = menu === 'model_statistic' ? true : false;
      this.openTestModel = menu === 'test_model' ? true : false;
    },
  },
  async mounted() {
    this.TaskTitle = this.Task.displayInformation.taskTitle;
    window.addEventListener('resize', this.handleResize);
  },

  activated() {
    this.TaskTitle = this.Task.displayInformation.taskTitle;
    let prevState = this.$store.getters.globalTaskFrameState(
      this.Task.trainingInformation.modelId
    );

    if (prevState) {
      // if previous state exist, load it
      this.isActiveModelDesc = prevState.isActiveModelDesc;
      this.openModelDesc = prevState.openModelDesc;
      this.isActiveUploadData = prevState.isActiveUploadData;
      this.isActiveTestModel = prevState.isActiveTestModel;
      this.openUploadData = prevState.openUploadData;
      this.openTestModel = prevState.openTestModel;
      this.isActiveModelStatistic = prevState.isActiveModelStatistic;
      this.openModelStatistic = prevState.openModelStatistic;
      this.isSidebarOpen = prevState.isSidebarOpen;
    } else {
      // if previous state does not exist, initilize variable to initial values
      this.isActiveModelDesc = false;
      this.openModelDesc = true;
      this.isActiveUploadData = false;
      this.isActiveTestModel = false;
      this.openUploadData = false;
      this.openTestModel = false;
      this.isActiveModelStatistic = false;
      this.openModelStatistic = false;
      this.isSidebarOpen = window.innerWidth <= 1024 ? false : true;
    }
  },
  async deactivated() {
    let currentState = {
      modelId: this.Task.trainingInformation.modelId,
      isActiveModelDesc: this.isActiveModelDesc,
      openModelDesc: this.openModelDesc,
      isActiveUploadData: this.isActiveUploadData,
      isActiveTestModel: this.isActiveTestModel,
      openUploadData: this.openUploadData,
      openTestModel: this.openTestModel,
      isActiveModelStatistic: this.isActiveModelStatistic,
      openModelStatistic: this.openModelStatistic,
      isSidebarOpen: this.isSidebarOpen,
    };
    await this.$store.commit('addGlobalTaskFrameState', currentState);
  },
  unmounted() {
    window.removeEventListener('resize', this.handleResize);
  },
  beforeRouteUpdate(to, from, next) {
    if (to.name.includes('training')) {
      this.openSidebarMenu('upload_data');
    }
    next();
  },
};
</script>

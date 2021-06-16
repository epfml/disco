<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main class="flex-1 pt-4">
      <!-- Main Page Content -->
      <div
        class="flex flex-col pt-4 items-right justify-start flex-1 h-full min-h-screen overflow-y-auto"
      >
        <!-- Welcoming words -->
        <div>
          <h1 class="text-xl pl-10 font-medium leading-none">
            <span class="text-primary-dark dark:text-primary-light">DeAI </span>
            - Decentralized Collaborative Machine Learning
          </h1>
        </div>

        <section class="flex-col items-center justify-center p-4 space-y-4">
          <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
            <!-- Titanic's card-->
            <div
              class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark"
            >
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  DeAI enables collaborative and privacy-preserving training of
                  machine learning models. DeAI is an easy-to-use mobile app &
                  web software, running directly in your browser.
                </ul>
              </div>
            </div>

            <div
              class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark"
            >
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  <b>Key Question:</b>
                  Can we keep control over our own data, while still benefitting
                  from joint collaborative training with other participants? -
                  or - Can we train an ML model which is equally good as if all
                  data were in one place, but respect privacy?
                </ul>
              </div>
            </div>

            <div
              class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark"
            >
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  <b>Decentralized learning:</b>
                  makes this possible, following the same principles as in
                  federated learning, but going one step further by removing any
                  central coordinator. DeAI only uses
                  <a class="text-blue-600" href="https://peerjs.com/"
                    >peer2peer</a
                  >
                  communication, while keeping your data local at all times. It
                  puts users in control of the entire collaborative training
                  process, without a central point of failure. We support all
                  modern deep learning architectures running on device
                  (currently via
                  <a class="text-blue-600" href="https://www.tensorflow.org/js"
                    >TF.js</a
                  >).
                </ul>
              </div>
            </div>

            <div
              class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark"
            >
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  <b>Science behind DeAI:</b>
                  In this project we aim to build and improve decentralized
                  versions of current machine learning algorithms, which are at
                  the same time (i) efficient (<a
                    class="text-blue-600"
                    href="https://github.com/epfml/powergossip"
                    >R1</a
                  >,<a
                    class="text-blue-600"
                    href="https://github.com/epfml/ChocoSGD"
                    >R2</a
                  >), (ii) privacy-preserving (<a
                    class="text-blue-600"
                    href="https://arxiv.org/abs/2006.04747"
                    >R3</a
                  >), (iii) fault-tolerant and dynamic over time (<a
                    class="text-blue-600"
                    href="https://arxiv.org/abs/1910.12308"
                    >R4</a
                  >), (iv) robust to malicious actors (<a
                    class="text-blue-600"
                    href="https://arxiv.org/abs/2012.10333"
                    >R5</a
                  >,<a
                    class="text-blue-600"
                    href="https://arxiv.org/abs/2006.09365"
                    >R6</a
                  >), and (iv) support fair incentives and transparency on the
                  resulting utility of trained ML models. We currently follow a
                  public model, private data approach.
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div class="flex items-center justify-center p-4">
          <button
            v-on:click="goToTaskList()"
            type="button"
            class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
          >
            Task List
          </button>
        </div>
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
import { initializeIndexedDB } from "../helpers/my_memory_script/indexedDB_script";

export default {
  name: "taskList",
  methods: {
    goToTaskList() {
      this.$router.push({
        path: "/tasks",
      });
    },
  },
  mounted() {
    initializeIndexedDB();
  },
};
</script>

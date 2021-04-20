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
                <span class="text-primary-dark dark:text-primary-light"
                  >Welcome.</span
                >
                To start training, pick a task in the list bellow. Have fun!
              </h1>
            </div>

            <!--TO DO: for loop to store display content based on task description -->
            <!-- Titanic's card-->
            <section class="flex-col items-center justify-center p-4 space-y-4">
              <div
                class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1"
              >
                <div
                  class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark"
                >
                  <div>
                    <h6
                      class="text-xl font-medium leading-none tracking-wider uppercase dark:group-hover:text-darker"
                    >
                      Titanic
                    </h6>
                  </div>
                  <div class="ml-10">
                    <ul
                      class="text-lg ont-semibold text-gray-500 dark:text-light"
                    >
                      In this challenge, we ask you to build a predictive model
                      that answers the question: “what sorts of people were more
                      likely to survive?” using passenger data (ie name, age,
                      gender, socio-economic class, etc).
                    </ul>
                  </div>
                  <div>
                    <span>
                      <a v-on:click="goToSelection()" class="no-underline font-medium"
                        >Click here to participate</a
                      >
                    </span>
                  </div>
                </div>

                <!-- MNIST card-->
                <div
                  class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark"
                >
                  <div>
                    <h6
                      class="text-xl font-medium leading-none tracking-wider uppercase dark:group-hover:text-darker"
                    >
                      MNIST
                    </h6>
                  </div>
                  <div class="ml-10">
                    <ul
                      class="text-lg ont-semibold text-gray-500 dark:text-light"
                    >
                      In this challenge, we ask you to build a predictive model
                      that answers the question: “what sorts of people were more
                      likely to survive?” using passenger data (ie name, age,
                      gender, socio-economic class, etc)..
                    </ul>
                  </div>
                  <div>
                    <span>
                      <a v-on:click="this.$router.push({ path: mnist })" class="no-underline font-medium"
                        >Click here to participate</a
                      >
                    </span>
                  </div>
                </div>

                <!-- LUSCOVID card-->
                <div
                  class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark"
                >
                  <div>
                    <h6
                      class="text-xl font-medium leading-none tracking-wider uppercase dark:group-hover:text-darker"
                    >
                      LUS-COVID
                    </h6>
                  </div>
                  <div class="ml-10">
                    <ul
                      class="text-lg ont-semibold text-gray-500 dark:text-light"
                    >
                      This model plans to predict whether the patient is covid positive or negative from lung ultrasound images.
                    </ul>
                  </div>
                  <div>
                    <span>
                      <a v-on:click="this.$router.push({ path: luscovid })" class="no-underline font-medium"
                        >Click here to participate</a
                      >
                    </span>
                  </div>
                </div>
              </div>
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
 export default{
  name:'taskList',
  data(){
   return{
    taskSelected: "",
    mnist: "/mnist-model/description",
    luscovid:"/lus-covid-model/description"
   }
  }, 
  methods: {
      goToSelection(task_name) {
          this.$router.push({ path: "/titanic-model/description" });
      }
  }, 
 
 }
</script>
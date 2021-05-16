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
              >Information.</span
            >
            <br>
            <br>
            This app was developped in the Machine Learning and Optimization
            Laboratory at EPFL.
            <br>
            <br>
            More information about decentralized learning
            <a
              href="https://www.epfl.ch/labs/mlo/"
              target="_blank"
              class="text-blue-500 hover:underline"
              >here</a
            >.
            <br>
            <br>
            The source code of the app can be found on
            <a
              href="https://github.com/epfml/DeAI"
              target="_blank"
              class="text-blue-500 hover:underline"
              >Github</a
            >.
            <br>
            <br>
            Finally, you can join our <a
              href="https://deai.slack.com/"
              target="_blank"
              class="text-blue-500 hover:underline"
              >Slack</a
            > page to discuss the app. 
          </h1>
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
export default {
  name: "Information",
  methods: {
    goToLabPage() {},
  },
};
</script>
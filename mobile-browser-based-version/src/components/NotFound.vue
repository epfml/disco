<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main class="flex-1 pt-4">
      <!-- Main Page Content -->
      <div
        class="
          flex flex-col
          pt-4
          items-right
          justify-start
          flex-1
          h-full
          min-h-screen
          overflow-y-auto
        "
      >
        <!-- Welcoming words -->
        <div>
          <h1 class="text-xl pl-10 font-medium leading-none">
            <span class="text-primary-dark dark:text-primary-light">FeAI </span>
            -
            <span class="text-primary-dark dark:text-primary-light">Fe</span
            >derated
            <span class="text-primary-dark dark:text-primary-light">AI</span>
          </h1>
        </div>

        <section class="flex-col items-center justify-center p-4 space-y-4">
          <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
            <!-- Titanic's card-->
            <div
              class="
                group
                flex-col
                items-center
                justify-between
                p-4
                bg-white
                rounded-md
                dark:bg-darker dark:bg-dark
              "
            >
              <div
                class="ml-10 text-xl text-gray-500 dark:text-light ont-semibold"
              >
                <span class="text-primary-dark dark:text-primary-light">
                  Page Not Found
                </span>
                <p class="text-base">
                  The page you asked for does not currently exist.
                </p>
              </div>
            </div>
            <div class="flex items-center justify-center p-4">
              <button
                v-on:click="goToPreviousPage()"
                type="button"
                class="
                  w-1/6
                  text-lg
                  border-2 border-transparent
                  bg-green-500
                  ml-3
                  py-2
                  px-4
                  font-bold
                  uppercase
                  text-white
                  rounded
                  transform
                  transition
                  motion-reduce:transform-none
                  hover:scale-105
                  duration-500
                  focus:outline-none
                "
              >
                Go Back
              </button>
              <button
                v-on:click="goToHomePage()"
                type="button"
                class="
                  w-1/6
                  text-lg
                  border-2 border-transparent
                  bg-green-500
                  ml-3
                  py-2
                  px-4
                  font-bold
                  uppercase
                  text-white
                  rounded
                  transform
                  transition
                  motion-reduce:transform-none
                  hover:scale-105
                  duration-500
                  focus:outline-none
                "
              >
                Home Page
              </button>
            </div>
          </div>
        </section>
      </div>

      <!-- Main Page Footer-->
      <footer
        class="
          flex
          items-center
          justify-between
          p-4
          bg-white
          border-t
          dark:bg-darker dark:border-primary-darker
        "
      >
        <div>FeAI &copy; 2021</div>
        <div>
          Join us on
          <a
            href="https://github.com/epfml/FeAI"
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
  name: 'not-found',
  methods: {
    goToPreviousPage() {
      this.$router.go(-1);
    },
    goToHomePage() {
      this.$router.push({ name: 'home' });
    },
  },
};
</script>

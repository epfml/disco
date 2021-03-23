<template>
    <!-- Statistics links -->
          <div>
            <!-- active classes 'bg-primary-100 dark:bg-primary' -->
            <a href="#" v-on:click="$event.preventDefault(); open = !open"
              class="flex items-center p-2 text-gray-500 transition-colors rounded-md dark:text-light hover:bg-primary-100 dark:hover:bg-primary"
              :class="{ 'bg-primary-100 dark:bg-primary': isActive || open }" role="button" aria-haspopup="true"
              :aria-expanded="(open || isActive) ? 'true' : 'false'">
              <span aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-graph-up w-5 h-5"
                  viewBox="0 0 16 16">
                  <path fill-rule="evenodd"
                    d="M0 0h1v15h15v1H0V0zm10 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V4.9l-3.613 4.417a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61L13.445 4H10.5a.5.5 0 0 1-.5-.5z" />
                </svg>
              </span>
              <span class="ml-2 text-sm"> Model Statistics </span>
              <span aria-hidden="true" class="ml-auto">
                <!-- active class 'rotate-180' -->
                <svg class="w-4 h-4 transition-transform transform" :class="{ 'rotate-180': open }"
                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </a>
            <div v-if="open" class="mt-2 space-y-2 px-7" role="menu" arial-label="Pages">
              <!-- active & hover classes 'text-gray-700 dark:text-light' -->
              <!-- inActive classes 'text-gray-400 dark:text-gray-400' -->
              <a href="#" role="menuitem"
                class="block p-2 text-sm text-gray-400 transition-colors duration-200 rounded-md dark:text-gray-400 dark:hover:text-light hover:text-gray-700">
                Blank
              </a>
              <a href="#" role="menuitem"
                class="block p-2 text-sm text-gray-400 transition-colors duration-200 rounded-md dark:text-gray-400 dark:hover:text-light hover:text-gray-700">
                Blank
              </a>
            </div>
          </div>
</template>

<script>
export default {
  name: 'StatisticsLink',
  props: {
  },
  methods: {
  },
  data(){
      return{
          isActive: false,
          open: false
      }
  }
}
</script>
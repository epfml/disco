<template>
    <!-- Model Description links -->
          <div>
            <!-- active & hover classes 'bg-primary-100 dark:bg-primary' -->
            <a href="task-desc.html" v-on:click="$event.preventDefault(); open = !open"
              class="flex items-center p-2 text-gray-500 transition-colors rounded-md dark:text-light hover:bg-primary-100 dark:hover:bg-primary"
              :class="{'bg-primary-100 dark:bg-primary': isActive || open}" role="button" aria-haspopup="true"
              :aria-expanded="(open || isActive) ? 'true' : 'false'">

              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-card-heading w-5 h-h"
                viewBox="0 0 16 16">
                <path
                  d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z" />
                <path
                  d="M3 8.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5zm0-5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-1z" />
              </svg>
              <span class="ml-2 text-sm">MNIST Model Information </span>
              <span class="ml-auto" aria-hidden="true">
                <!-- active class 'rotate-180' -->
                <svg class="w-4 h-4 transition-transform transform" :class="{ 'rotate-180': open }"
                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </a>
            <div role="menu" v-if="open" class="mt-2 space-y-2 px-7" aria-label="Dashboards">
              <!-- active & hover classes 'text-gray-700 dark:text-light' -->
              <!-- inActive classes 'text-gray-400 dark:text-gray-400' -->
              <a href="task-desc.html#overview-target" role="menuitem"
                class="block p-2 text-sm text-gray-400 transition-colors duration-200 rounded-md dark:text-gray-400 dark:hover:text-light hover:text-gray-700">
                Overview
              </a>
              <a href="task-desc.html#limitations-target" role="menuitem"
                class="block p-2 text-sm text-gray-400 transition-colors duration-200 rounded-md dark:hover:text-light hover:text-gray-700">
                Limitations
              </a>
              <a href="task-desc.html#tradeoffs-target" role="menuitem"
                class="block p-2 text-sm text-gray-400 transition-colors duration-200 rounded-md dark:hover:text-light hover:text-gray-700">
                Trade-offs
              </a>
            </div>
          </div>
</template>

<script>
export default {
  name: 'ModelDescriptionLink',
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
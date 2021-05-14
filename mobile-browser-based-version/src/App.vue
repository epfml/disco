<template>
  <div :class="{ dark: isDark }">
    <!-- Global container for the screen-->
    <div
      class="flex h-screen antialiased text-gray-900 bg-gray-100 dark:bg-dark dark:text-light"
    >
      <!-- Loading screen -->
      <div
        v-show="loading"
        class="fixed inset-0 z-50 flex items-center justify-center text-2xl font-semibold text-white bg-primary-darker"
      >
        Loading.....
      </div>

      <!-- Sidebar Minimal -->
      <!-- Sidebar Backdrop -->
      <div
        v-if="isSidebarOpen"
        v-on:click="isSidebarOpen = false"
        class="fixed inset-0 z-10 bg-primary-darker md:hidden"
        style="opacity: 0.5"
        aria-hidden="true"
      ></div>
      <aside
        class="fixed inset-y-0 z-10 flex flex-shrink-0 bg-white border-r md:static dark:border-primary-darker dark:bg-darker focus:outline-none"
        style="position: sticky"
      >
        <!-- Mini Sidebar -->
        <nav
          class="flex flex-col flex-shrink-0 h-full px-2 py-4 border-r dark:border-primary-darker"
        >
          <!-- Brand -->
          <div class="flex-shrink-0">
            <a
              href="task-list.html"
              class="p-1 inline-block text-xl font-bold tracking-wider uppercase text-primary-dark dark:text-light"
            >
              De-AI
            </a>
          </div>

          <!-- Mini Sidebar content-->
          <div
            class="flex flex-col items-center justify-center flex-1 space-y-4"
          >
            <!-- Home link -->
            <!-- Active classes "bg-primary text-white" -->
            <!-- inActive classes "bg-primary-50 text-primary-lighter" -->
            <a
              v-on:click="goToHome()"
              class="p-2 text-white transition-colors duration-200 rounded-full bg-primary hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark focus:outline-none focus:bg-primary-100 dark:focus:bg-primary-dark focus:ring-primary-darker"
            >
              <span class="sr-only">Home</span>
              <svg
                class="w-7 h-7"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </a>
            <!-- Info link -->
            <!-- Active classes "bg-primary text-white" -->
            <!-- inActive classes "bg-primary-50 text-primary-lighter" -->
            <a
              href="#"
              class="p-2 transition-colors duration-200 rounded-full text-primary-lighter bg-primary-50 hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark focus:outline-none focus:bg-primary-100 dark:focus:bg-primary-dark focus:ring-primary-darker"
            >
              <span class="sr-only">Messages</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                class="bi bi-info-circlew-7 h-7"
                viewBox="0 0 16 16"
              >
                <path
                  d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
                />
                <path
                  d="M8.93 6.588l-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"
                />
              </svg>
            </a>

            <!-- Trophee Class -->
            <!-- Active classes "bg-primary text-white" -->
            <!-- inActive classes "bg-primary-50 text-primary-lighter" -->
            <a
              href="#"
              class="p-2 transition-colors duration-200 rounded-full text-primary-lighter bg-primary-50 hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark focus:outline-none focus:bg-primary-100 dark:focus:bg-primary-dark focus:ring-primary-darker"
            >
              <span class="sr-only">Trophee Link</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                class="bi bi-trophy w-7 h-7"
                viewBox="0 0 16 16"
              >
                <path
                  d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5c0 .538-.012 1.05-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33.076 33.076 0 0 1 2.5.5zm.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935zm10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935zM3.504 1c.007.517.026 1.006.056 1.469.13 2.028.457 3.546.87 4.667C5.294 9.48 6.484 10 7 10a.5.5 0 0 1 .5.5v2.61a1 1 0 0 1-.757.97l-1.426.356a.5.5 0 0 0-.179.085L4.5 15h7l-.638-.479a.501.501 0 0 0-.18-.085l-1.425-.356a1 1 0 0 1-.757-.97V10.5A.5.5 0 0 1 9 10c.516 0 1.706-.52 2.57-2.864.413-1.12.74-2.64.87-4.667.03-.463.049-.952.056-1.469H3.504z"
                />
              </svg>
            </a>

            <!-- Get Memory Pannel-->
            <button
              v-on:click="openMemoryPannel"
              class="p-2 transition-colors duration-200 rounded-full text-primary-lighter bg-primary-50 hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark focus:outline-none focus:bg-primary-100 dark:focus:bg-primary-dark focus:ring-primary-darker"
            >
              <span class="sr-only">Open memory panel</span>
              <svg
                class="w-6 h-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 16 16"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4H2.19zm4.69-1.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707z"
                />
              </svg>
            </button>

            <!-- Get Setting Pannel-->
            <button
              v-on:click="openSettingsPanel"
              class="p-2 transition-colors duration-200 rounded-full text-primary-lighter bg-primary-50 hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark focus:outline-none focus:bg-primary-100 dark:focus:bg-primary-dark focus:ring-primary-darker"
            >
              <span class="sr-only">Open settings panel</span>
              <svg
                class="w-7 h-7"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>

            <!-- Get the dark mode -->
            <button
              aria-hidden="true"
              class="relative focus:outline-none"
              x-cloak
              v-on:click="toggleTheme"
            >
              <div
                class="w-12 h-6 transition rounded-full outline-none bg-primary-100 dark:bg-primary-lighter"
              ></div>
              <div
                class="absolute top-0 left-0 inline-flex items-center justify-center w-6 h-6 transition-all duration-150 transform scale-110 rounded-full shadow-sm"
                :class="{
                  'translate-x-0 -translate-y-px  bg-white text-primary-dark': !isDark,
                  'translate-x-6 text-primary-100 bg-primary-darker': isDark,
                }"
              >
                <svg
                  v-show="!isDark"
                  class="w-4 h-4"
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
                <svg
                  v-show="isDark"
                  class="w-4 h-4"
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
              </div>
            </button>
          </div>
        </nav>
      </aside>

      <!-- Panels -->

      <div style="position: absolute; z-index: 100">
        <!-- Settings Panel -->
        <!-- Backdrop -->
        <transition
          enter-class="transition duration-300 ease-in-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-class="transition duration-300 ease-in-out"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-show="isSettingsPanelOpen"
            v-on:click="isSettingsPanelOpen = false"
            class="transform fixed inset-0 z-10 bg-primary-darker"
            style="opacity: 0.5"
            aria-hidden="true"
          ></div>
        </transition>

        <!-- Setting Panel Content -->
        <transition
          enter-active-class="transition duration-300 ease-in-out sm:duration-500"
          enter-from-class="translate-x-full"
          enter-class="translate-x-0"
          leave-active-class="transition duration-300 ease-in-out sm:duration-500"
          leave-class="translate-x-0"
          leave-to-class="translate-x-full"
        >
          <!-- @keydown.escape="isSettingsPanelOpen = false" -->
          <section
            x-ref="settingsPanel"
            tabindex="-1"
            v-show="isSettingsPanelOpen"
            class="transform fixed inset-y-0 right-0 z-20 w-full max-w-xs bg-white shadow-xl dark:bg-darker dark:text-light sm:max-w-md focus:outline-none"
            aria-labelledby="settinsPanelLabel"
          >
            <div class="absolute left-0 p-2 transform -translate-x-full">
              <!-- Close button -->
              <button
                v-on:click="isSettingsPanelOpen = false"
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
                <span class="text-gray-500 dark:text-primary">
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
                        'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100': !isDark,
                        'text-gray-500 dark:text-primary-light': isDark,
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
                        'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100': isDark,
                        'text-gray-500 dark:text-primary-light': !isDark,
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
        </transition>
      </div>

      <div style="position: absolute; z-index: 100">
        <!-- Memory Panel -->
        <!-- Backdrop -->
        <transition
          enter-class="transition duration-300 ease-in-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-class="transition duration-300 ease-in-out"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-show="isMemoryPannelOpen"
            v-on:click="isMemoryPannelOpen = false"
            class="transform fixed inset-0 z-10 bg-primary-darker"
            style="opacity: 0.5"
            aria-hidden="true"
          ></div>
        </transition>

        <!-- Memory Panel Content -->
        <transition
          enter-active-class="transition duration-300 ease-in-out sm:duration-500"
          enter-from-class="translate-x-full"
          enter-class="translate-x-0"
          leave-active-class="transition duration-300 ease-in-out sm:duration-500"
          leave-class="translate-x-0"
          leave-to-class="translate-x-full"
        >
          <!-- @keydown.escape="isSettingsPanelOpen = false" -->
          <section
            x-ref="settingsPanel"
            tabindex="-1"
            v-show="isMemoryPannelOpen"
            class="transform fixed inset-y-0 right-0 z-20 w-full max-w-xs bg-white shadow-xl dark:bg-darker dark:text-light sm:max-w-md focus:outline-none"
            aria-labelledby="settinsPanelLabel"
          >
            <div class="absolute left-0 p-2 transform -translate-x-full">
              <!-- Close button -->
              <button
                v-on:click="isMemoryPannelOpen = false"
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
                <span class="text-gray-500 dark:text-primary">
                  <svg
                    class="w-10 h-10"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 18 15"
                    stroke="currentColor"
                  >
                    <path
                      d="m14.12 10.163 1.715.858c.22.11.22.424 0 .534L8.267 15.34a.598.598 0 0 1-.534 0L.165 11.555a.299.299 0 0 1 0-.534l1.716-.858 5.317 2.659c.505.252 1.1.252 1.604 0l5.317-2.66zM7.733.063a.598.598 0 0 1 .534 0l7.568 3.784a.3.3 0 0 1 0 .535L8.267 8.165a.598.598 0 0 1-.534 0L.165 4.382a.299.299 0 0 1 0-.535L7.733.063z"
                    />
                    <path
                      d="m14.12 6.576 1.715.858c.22.11.22.424 0 .534l-7.568 3.784a.598.598 0 0 1-.534 0L.165 7.968a.299.299 0 0 1 0-.534l1.716-.858 5.317 2.659c.505.252 1.1.252 1.604 0l5.317-2.659z"
                    />
                  </svg>
                </span>
                <h2
                  id="settinsPanelLabel"
                  class="text-xl font-medium text-gray-500 dark:text-light"
                >
                  Memory
                </h2>
              </div>
              <!-- Content -->
              <div class="flex-1 overflow-hidden hover:overflow-y-auto">
                <!-- Theme -->
                <div class="p-4 space-y-4 md:p-8">
                  <h6 class="text-lg font-medium text-gray-400 dark:text-light">
                    Warning
                  </h6>
                  <span class="text-s">
                    When a model has been deleted, the application might need to
                    be re-launched.
                  </span>
              
                </div>

                <!-- Model list -->
                <div class="p-4 space-y-4 md:p-8">
                  <h6 class="text-lg font-medium text-gray-400 dark:text-light">
                    Models in memory
                  </h6>
                  <div v-for="(item, idx) in modelMap" :key="idx">
                    <div
                      class="flex items-center justify-between px-4 py-2 space-x-4 transition-colors border rounded-md hover:text-gray-900 hover:border-gray-900 dark:border-primary dark:hover:text-primary-100 dark:hover:border-primary-light focus:outline-none focus:ring focus:ring-primary-lighter focus:ring-offset-2 dark:focus:ring-offset-dark dark:focus:ring-primary-dark"
                    >
                      <span> {{ item[1].name.substr(12) }} <br> <span class="text-xs">
                        {{item[1].date}} at {{item[1].hours}} <br> {{item[1].size}} KB
                        </span>
                        </span>
                      <button
                        v-on:click="deleteModel(item[1].name)"
                        class="flex items-center justify-center px-4 py-2 space-x-4 transition-colors border rounded-md hover:text-gray-900 hover:border-gray-900 dark:border-primary dark:hover:text-primary-100 dark:hover:border-primary-light focus:outline-none focus:ring focus:ring-primary-lighter focus:ring-offset-2 dark:focus:ring-offset-dark dark:focus:ring-primary-dark"
                        :class="{
                          'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100': isDark,
                          'text-gray-500 dark:text-primary-light': !isDark,
                        }"
                      >
                        <span>
                          <svg
                            class="w-7 h-7"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 17 17"
                            stroke="currentColor"
                          >
                            <path
                              d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"
                            />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                
                </div>
              </div>
            </div>
          </section>
        </transition>
      </div>

      <!-- Main Page -->
      <div class="overflow-x-scroll">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script>
import * as tf from "@tensorflow/tfjs";
import { getKernel } from "@tensorflow/tfjs";

export default {
  data: function () {
    return {
      loading: false,
      isDark: this.getTheme(), // TO BE MODIFIED
      color: this.getColor(),
      selectedColor: this.getColor(),
      isSidebarOpen: window.innerWidth >= 1024 ? true : false,
      isSettingsPanelOpen: false,
      modelMap: new Map(),
      isMemoryPannelOpen: false,
    };
  },
  methods: {
    getTheme: function () {
      if (window.localStorage.getItem("dark")) {
        return JSON.parse(window.localStorage.getItem("dark"));
      }
      return (
        !!window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    },
    getColor: () => {
      if (window.localStorage.getItem("color")) {
        return window.localStorage.getItem("color");
      } else {
        return "cyan";
      }
    },
    setTheme: function (value) {
      window.localStorage.setItem("dark", value);
    },
    setColors(color) {
      const root = document.documentElement;
      root.style.setProperty("--color-primary", `var(--color-${color})`);
      root.style.setProperty("--color-primary-50", `var(--color-${color}-50)`);
      root.style.setProperty(
        "--color-primary-100",
        `var(--color-${color}-100)`
      );
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
    toggleTheme: function () {
      this.isDark = !this.isDark;
      this.setTheme(this.isDark);
    },
    setLightTheme: function () {
      this.isDark = false;
      this.setTheme(this.isDark);
    },
    setDarkTheme() {
      this.isDark = true;
      this.setTheme(this.isDark);
    },
    watchScreen() {
      if (window.innerWidth <= 1024) {
        this.isSidebarOpen = false;
      } else if (window.innerWidth >= 1024) {
        this.isSidebarOpen = true;
      }
    },
    toggleSidbarMenu() {
      this.isSidebarOpen = !this.isSidebarOpen;
    },
    openSettingsPanel() {
      this.refreshModel()
      this.isSettingsPanelOpen = true;
    },
    async openMemoryPannel() {
      this.isMemoryPannelOpen = true;
      await this.refreshModel();
    },
    goToHome() {
      this.$router.push({ name: "home" });
    },
    async refreshModel() {
      var new_model_map = new Map();
      tf.io.listModels().then((models) => {
        for (var key in models) {
          var model_info = models[key];
          let date = new Date(model_info.dateSaved);
          let date_saved =
            date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear();
          let hour_saved = date.getHours() + "h" + date.getMinutes();
          let size = model_info.modelTopologyBytes + model_info.weightSpecsBytes + model_info.weightDataBytes

          new_model_map.set(key, {
            name: key,
            date: date_saved,
            hours: hour_saved,
            size: size/1000,
          });
        }

        this.modelMap = new_model_map;
      });
    },

    async deleteModel(model_name) {
      console.log(model_name);
      this.modelMap.delete(model_name)
      await tf.io.removeModel(model_name)
    },

  },
  async mounted() {
    tf.io.listModels().then((models) => {
      for (var key in models) {
        var model_info = models[key];
        let date = new Date(model_info.dateSaved);
        let date_saved =
          date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear();
        let hour_saved = date.getHours() + "h" + date.getMinutes();
        let size = model_info.modelTopologyBytes + model_info.weightSpecsBytes + model_info.weightDataBytes
        
        this.modelMap.set(key, {
          name: key,
          date: date_saved,
          hours: hour_saved,
          size: size/1000,
        });
      }
    });
  },
};

</script>




<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main :class="`${override ? '' : 'flex-1'} ${customClass}`">
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
        <section
          v-if="withSection"
          class="flex-col items-center justify-center p-4 space-y-4"
        >
          <slot></slot>
        </section>
        <slot v-else></slot>
      </div>
    </main>
  </div>
</template>

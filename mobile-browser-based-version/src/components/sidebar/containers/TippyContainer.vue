<template>
  <!-- Panel content -->
  <div class="flex flex-col h-screen">
    <!-- Panel header -->
    <div
      class="
        flex flex-col
        items-center
        justify-center
        flex-shrink-0
        px-4
        py-8
        space-y-4
        border-b
        dark:border-primary-dark
      "
    >
      <span class="text-gray-500 dark:text-primary">
        <slot name="icon"></slot>
      </span>
      <h2 class="text-xl font-medium text-gray-500 dark:text-light"
      >
        {{this.title}}
      </h2>
    </div>
    <!-- Content -->
    <div class="flex-1 overflow-hidden hover:overflow-y-auto">
      <slot name="content"></slot>
    </div>
  </div>
</template>
<script>

export default {
  name: 'tippy-container',
  props: {
      title: {default: '', type: String}
  },
};
</script>

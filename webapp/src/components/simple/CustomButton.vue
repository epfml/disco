<template>
  <button
    type="button"
    class="px-4 py-2 min-w-32 text-lg capitalize text-white bg-disco-cyan font-disco rounded-full duration-200 hover:bg-transparent dark:hover:bg-transparent hover:outline-solid hover:outline-2 hover:outline-disco-cyan dark:hover:outline-disco-light-cyan hover:text-disco-cyan dark:hover:text-disco-light-cyan"
  >
    <slot />
    <!-- Optional description slot -->
    <div v-if="$slots.description" class="normal-case text-xs opacity-70 mt">
      <slot name="description" />
    </div>
  </button>
</template>

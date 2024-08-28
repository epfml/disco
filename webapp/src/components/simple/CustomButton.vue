<template>
  <button
    type="button"
    class="
    px-4 py-1 min-w-[8rem]
    text-lg uppercase text-white
    bg-disco-cyan
    rounded duration-200
    hover:bg-white hover:outline hover:outline-disco-cyan hover:outline-2 hover:text-disco-cyan"
  >
    <slot />
    <!-- Optional description slot -->
    <div v-if="$slots.description" class="normal-case text-xs opacity-70 mt">
      <slot name="description" />
    </div>
  </button>
</template>

<script lang="ts" setup />

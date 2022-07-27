<template>
  <div class="p-4 space-y-4 md:p-8">
    <h6 class="text-lg font-medium text-gray-400 dark:text-light">
      <slot name="title" />
    </h6>
    <slot name="content" />
  </div>
</template>

<script setup lang="ts" />

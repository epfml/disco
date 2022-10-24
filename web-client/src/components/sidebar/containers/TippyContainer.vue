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
      "
    >
      <span class="text-slate-500">
        <slot name="icon" />
      </span>
      <h2 class="text-xl font-medium text-slate-500">
        <slot name="title" />
      </h2>
    </div>
    <!-- Content -->
    <div class="flex-1 overflow-hidden hover:overflow-y-auto">
      <slot name="content" />
    </div>
  </div>
</template>

<script setup lang="ts" />

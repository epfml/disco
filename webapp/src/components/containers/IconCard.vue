<template>
  <!--  Card -->
  <div class="grid grid-cols-1 space-y-8 lg:gap-8 rounded-xl group/super">
    <div class="col-span-1 bg-white rounded-xl">
      <!-- Card header -->
      <div
        class="
          flex
          items-center
          justify-between
          p-4 md:p-6
        "
      >
        <h4
          class="flex w-full text-xl text-disco-blue group-hover/super:text-disco-cyan"
          :class="`justify-${titlePlacement} text-${titlePlacement}`"
        >
          <div>
            <slot name="title" />
          </div>
        </h4>
        <div class="flex items-center">
          <span aria-hidden="true">
            <slot name="icon" />
          </span>
        </div>
      </div>
      <!-- Description -->
      <div
        v-show="withContent"
        class="text-sm text-slate-500 p-8 border-t"
      >
        <slot name="content" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

interface Props {
  withContent?: boolean
  titlePlacement?: 'left' | 'center' | 'right'
}
withDefaults(defineProps<Props>(), {
  withContent: true,
  titlePlacement: 'left'
})

</script>

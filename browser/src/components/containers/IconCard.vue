<template>
  <!--  Card -->
  <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
    <!-- div class="container mx-width lg h-full"></div-->
    <div class="col-span-1 bg-white rounded-lg">
      <!-- Card header -->
      <div
        class="
          flex
          items-center
          justify-between
          p-4
          border-b
        "
      >
        <h4 class="text-lg font-semibold text-slate-500">
          <slot name="title" />
        </h4>
        <div class="flex items-center">
          <span aria-hidden="true">
            <slot name="icon" />
          </span>
        </div>
      </div>
      <div v-if="showCardContent">
        <!-- Description -->
        <div class="text-sm text-slate-500 p-8">
          <slot name="content" />
        </div>
      </div>
      <!-- Hide content -->
      <div
        v-if="withToggle"
        class="relative p-4 flex items-center"
      >
        <span
          aria-hidden="true"
          @click="hideToggleAction"
        >
          <div v-show="showCardContent">
            <UpArrow />
          </div>
          <div
            v-show="!showCardContent"
            class="flex flex-row"
          >
            <DownArrow />
            <p class="px-4">Toggle to show</p>
          </div>
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import DownArrow from '@/assets/svg/DownArrow.vue'
import UpArrow from '@/assets/svg/UpArrow.vue'

export default defineComponent({
  name: 'IconCard',
  components: {
    DownArrow,
    UpArrow
  },
  props: {
    customClass: { default: '', type: String },
    withToggle: { default: false, type: Boolean }
  },
  data () {
    return {
      showCardContent: true
    }
  },
  mounted () {
    this.showCardContent = !this.withToggle
  },
  methods: {
    hideToggleAction () {
      this.showCardContent = !this.showCardContent
    }
  }
})
</script>

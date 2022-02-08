<template>
  <!--  Card -->
  <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
    <!-- div class="container mx-width lg h-full"></div-->
    <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
      <!-- Card header -->
      <div
        class="
          flex
          items-center
          justify-between
          p-4
          border-b
          dark:border-primary
        "
      >
        <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
          {{ header }}
        </h4>
        <div class="flex items-center">
          <span aria-hidden="true">
            <slot name="icon"></slot>
          </span>
        </div>
      </div>
      <div v-if="showCardContent">
        <!-- Descrition -->
        <div v-if="description" class="relative px-4 pt-4 overflow-x-hidden">
          <span class="text-sm text-gray-500 dark:text-light">
            <span v-html="description"></span>
          </span>
        </div>
        <!-- Extra -->
        <slot name="extra" v-if="hasExtraSlot"></slot>
      </div>
      <!-- Hide content -->
      <div class="pb-4">
        <div v-if="withToggle" class="relative pt-4 px-4 flex items-center">
          <span @click="hideToggleAction" aria-hidden="true">
            <div v-if="showCardContent">
              <up-arrow></up-arrow>
            </div>
            <div v-else class="flex flex-row">
              <down-arrow></down-arrow>
              <p class="px-4">Toggle to show {{ header }}</p>
            </div>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script type="ts">
import DownArrow from '../../assets/svg/DownArrow.vue'
import UpArrow from '../../assets/svg/UpArrow.vue'
export default {
  name: 'icon-card',
  components: {
    DownArrow,
    UpArrow
  },
  props: {
    header: { type: String },
    description: { type: String },
    customClass: { default: '', type: String },
    withToggle: { default: false, type: Boolean }
  },
  data () {
    return {
      showCardContent: true
    }
  },
  methods: {
    hideToggleAction () {
      this.showCardContent = !this.showCardContent
    }
  },
  computed: {
    hasExtraSlot () {
      return this.$slots.extra
    }
  },
  mounted () {
    this.showCardContent = !this.withToggle
  }
}
</script>

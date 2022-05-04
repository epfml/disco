<template>
  <div>
    <div class="grid grid-cols-2 p-4">
      <div
        v-if="prev"
        class="text-right p-4"
      >
        <CustomButton
          @click="prevStep"
        >
          Previous
        </CustomButton>
      </div>
      <div
        v-if="next"
        class="text-left p-4"
      >
        <CustomButton
          @click="nextStep"
        >
          Next
        </CustomButton>
      </div>
    </div>
    <slot />
  </div>
</template>

<script lang="ts">
import CustomButton from '@/components/simple/CustomButton.vue'

/**
 * TODO:
 * Add slot event "step-completed" to conditionally display the nextStep button.
 * Otherwise, use a single Step component (without slot) in Navgation.
 */
export default {
  name: 'Step',
  components: {
    CustomButton
  },
  props: {
    prev: {
      type: Boolean,
      default: true
    },
    next: {
      type: Boolean,
      default: true
    }
  },
  methods: {
    nextStep (): void {
      this.$emit('next-step')
    },
    prevStep (): void {
      this.$emit('prev-step')
    }
  }
}
</script>

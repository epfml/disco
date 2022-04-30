<template>
  <div>
    <div class="flex items-center justify-center p-4">
      <CustomButton
        :center="true"
        @click="prevStep"
      >
        Previous Step
      </CustomButton>
      <CustomButton
        v-show="stepCompleted"
        :center="true"
        @click="nextStep"
      >
        Next Step
      </CustomButton>
    </div>
    <slot @completed="markStepAsReady" />
  </div>
</template>

<script lang="ts">
import CustomButton from '@/components/simple/CustomButton.vue'

/**
 * TODO:
 * Add slot event "step-completed" to allow for the nextStep button to be displayed
 */

export default {
  name: 'Step',
  components: {
    CustomButton
  },
  props: {
    bornReady: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      markedReady: false
    }
  },
  computed: {
    stepCompleted (): boolean {
      return this.bornReady || this.markedReady
    }
  },
  methods: {
    nextStep (): void {
      this.$emit('next-step')
    },
    prevStep (): void {
      this.$emit('prev-step')
    },
    markStepAsReady (): void {
      this.markedReady = true
    }
  }
}
</script>

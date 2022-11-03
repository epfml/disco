<template>
  <div class="flex justify-center">
    <VeeField
      :id="props.field.id"
      v-model="validationValue"
      :name="props.field.id"
      type="text"
      :value="value"
      hidden
    />
    <CheckBox
      :value="value"
      @clicked="clicked"
    />
  </div>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits, ref } from 'vue'
import { Field as VeeField } from 'vee-validate'

import { FormField } from '@/task_creation_form'
import CheckBox from '@/components/simple/CheckBox.vue'

interface Props {
  field: FormField
}
const props = defineProps<Props>()

interface Emits {
  (e: 'clicked', v: boolean): void
}
const emit = defineEmits<Emits>()

const value = typeof props.field.default === 'boolean' ? props.field.default : false

const mutatedValue = ref(value)
const validationValue = ref('')

const clicked = () => {
  mutatedValue.value = !mutatedValue.value
  validationValue.value = mutatedValue ? 'true' : ''
  emit('clicked', mutatedValue.value)
}
</script>

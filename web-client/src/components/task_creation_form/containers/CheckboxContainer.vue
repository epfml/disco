<template>
  <div class="flex justify-center">
    <VeeField
      :id="props.field.id"
      v-model="mutatedValue"
      :name="props.field.id"
      type="text"
      :value="mutatedValue"
      hidden
    />
    <CheckBox
      :value="mutatedValue"
      @clicked="clicked"
    />
  </div>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits, ref } from 'vue'
import { Field as VeeField } from 'vee-validate'

import { FormField } from '@/creation_form'
import CheckBox from '@/components/simple/CheckBox.vue'

interface Props {
  field: FormField
}
const props = defineProps<Props>()

interface Emits {
  (e: 'clicked', v: boolean): void
}
const emit = defineEmits<Emits>()
console.log(props.field.default)
const value = typeof props.field.default === 'boolean' ? props.field.default : false

const mutatedValue = ref(value)

const clicked = () => {
  mutatedValue.value = !mutatedValue.value
  emit('clicked', mutatedValue.value)
}
</script>

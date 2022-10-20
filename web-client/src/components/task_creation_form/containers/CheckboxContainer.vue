<template>
  <CustomField
    :field="props.field"
    :value="value"
  />
</template>

<script lang="ts" setup>
import { defineProps } from 'vue'

import { FormField } from '@/task_creation_form'
import CustomField from '@/components/task_creation_form/simple/CustomField.vue'

interface Props {
  field: FormField
}
const props = defineProps<Props>()

const value = typeof props.field.default === 'boolean' ? props.field.default : false
</script>

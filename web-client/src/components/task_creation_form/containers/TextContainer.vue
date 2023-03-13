<template>
  <CustomField
    :field="field"
    :available="available"
    :rows="rows"
  />
</template>

<script lang="ts" setup>
import { computed, defineProps } from 'vue'

import { FormField } from '@/creation_form'
import CustomField from '@/components/task_creation_form/simple/CustomField.vue'

const props = defineProps({
  field: {
    type: Object as () => FormField,
    required: true
  },
  available: {
    type: Boolean,
    default: true
  }
})

const rows = computed(() => props.field.as === 'textarea' ? 6 : undefined)
</script>

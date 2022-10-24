<template>
  <CustomField
    :field="props.field"
    :rows="rows"
  />
</template>

<script lang="ts" setup>
import { computed, defineProps } from 'vue'

import { FormField } from '@/task_creation_form'
import CustomField from '@/components/task_creation_form/simple/CustomField.vue'

interface Props {
  field: FormField
}
const props = defineProps<Props>()

const rows = computed(() => props.field.as === 'textarea' ? 6 : undefined)
</script>

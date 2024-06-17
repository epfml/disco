<template>
  <div class="flex">
    <ButtonsCard
      class="mx-auto"
      :buttons="List.of(['get started', () => emit('click')])"
    >
      <template #title>
        Build AI with collaborators
        <span class="underline">without sharing any data</span>
      </template>

      <ul>
        <li>Exchange <span class="italic">model</span> updates not data</li>
        <li>Keep data at its source</li>
        <li>
          Supports both <span class="italic">decentralized</span> and
          <span class="italic">federated</span> training
        </li>
      </ul>
    </ButtonsCard>
  </div>
</template>
<script lang="ts" setup>
import { List } from "immutable";

import ButtonsCard from "@/components/containers/ButtonsCard.vue";

const emit = defineEmits<{
  click: [];
}>();
</script>

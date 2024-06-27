<template>
  <div class="flex flex-col gap-4">
    <ButtonsCard
      class="mx-auto"
      :buttons="List.of(['get started', () => emit('click')])"
    >
      <template #title>
        <div class="flex justify-center">
          Build collaborative AI without sharing any data
        </div>
      </template>

      <ul style="list-style: &quot;✅&quot;">
        <li class="pl-2">Data stays private and offline</li>
        <li class="pl-2">Code-free and installation-free</li>
        <li class="pl-2">
          Collaborative training via federated and decentralized learning
        </li>
      </ul>
    </ButtonsCard>

    <IconCard title-placement="center" class="mx-auto">
      <template #title> DEMO </template>
      <template #content>
        Training states &amp; custom tasks are not persisted
      </template>
    </IconCard>
  </div>
</template>
<script lang="ts" setup>
import { List } from "immutable";

import ButtonsCard from "@/components/containers/ButtonsCard.vue";
import IconCard from "@/components/containers/IconCard.vue";

const emit = defineEmits<{
  click: [];
}>();
</script>

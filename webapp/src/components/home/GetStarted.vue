<template>
  <div
    class="grid grid-cols-1 gap-8 md:mx-20 lg:gap-16 lg:grid-cols-3 items-stretch"
  >
    <!-- Model testing -->
    <ButtonsCard
      title-align="center"
      :buttons="List.of(['more info', goToDiscoInformation])"
    >
      <template #title>
        Learn more about
        <span class="font-disco text-disco-cyan">DISCO</span> and distributed
        learning fundamentals
      </template>
    </ButtonsCard>

    <!-- List of tasks -->
    <ButtonsCard
      title-align="center"
      :buttons="List.of(['train', goToTaskList])"
    >
      <template #title>
        Train a model on existing
        <span
          title="A group of (DIS)tributed users with similar data, (CO)llaborating to train a model"
          ><span class="font-disco text-disco-cyan">DISCO</span
          >llaboratives</span
        >
      </template>
    </ButtonsCard>

    <!-- Task creation -->
    <ButtonsCard
      title-align="center"
      :buttons="List.of(['create', goToNewTaskCreationForm])"
    >
      <template #title>
        Add your own ML task to the
        <span
          title="A group of (DIS)tributed users with similar data, (CO)llaborating to train a model"
          ><span class="font-disco text-disco-cyan">DISCO</span
          >llaboratives</span
        >
      </template>
    </ButtonsCard>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from "vue-router";

import { List } from "immutable";

import ButtonsCard from "@/components/containers/ButtonsCard.vue";

const router = useRouter();

function goToTaskList(): void {
  router.push({ path: "/list" });
}
function goToNewTaskCreationForm(): void {
  router.push({ path: "/create" });
}
function goToDiscoInformation(): void {
  router.push({ path: "/information" });
}
</script>

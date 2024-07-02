<template>
  <div
    class="grid grid-cols-1 gap-8 md:mx-20 lg:gap-16 lg:grid-cols-3 items-stretch"
  >
    <!-- Model testing -->
    <ButtonsCard
      title-align="center"
      :buttons="List.of(['learn more', goToDiscoInformation])"
    >
      <template #title>
        Learn more about
        <DISCO /> and collaborative fundamentals
      </template>
    </ButtonsCard>

    <!-- List of tasks -->
    <ButtonsCard
      title-align="center"
      :buttons="List.of(['explore', goToTaskList])"
    >
      <template #title>
        Train a model and contribute to existing
        <span title="Click Explore to learn more on DISCOllaboratives">
          <DISCOllaboratives />
        </span>
      </template>
    </ButtonsCard>

    <!-- Task creation -->
    <ButtonsCard
      title-align="center"
      :buttons="List.of(['create', goToNewTaskCreationForm])"
    >
      <template #title>
        Add your own ML problem to the list of <DISCOllaboratives />
      </template>
    </ButtonsCard>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from "vue-router";

import { List } from "immutable";

import DISCO from "@/components/simple/DISCO.vue";
import DISCOllaboratives from "@/components/simple/DISCOllaboratives.vue";
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

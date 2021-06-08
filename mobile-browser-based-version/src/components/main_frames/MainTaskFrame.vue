<template>
  <keep-alive>
    <GlobalTaskFrame v-bind:Id="Id" v-bind:Task="Task" />
  </keep-alive>
</template>

<script>
import GlobalTaskFrame from "../building_frames/GlobalTaskFrame";
export default {
  name: "MainTaskFrame",
  props: {
    Id: String,
    Task: Object,
  },
  components: {
    GlobalTaskFrame,
  },
};
</script>
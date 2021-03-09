<template>
  <TrainingUploadImages msg="Welcome to Your Vue.js App" task_name="MNIST" :task_labels=[0,1,2,3,4,5,6,7,8,9] />
</template>

<script>
import TrainingUploadImages from './components/TrainingUploadImages.vue'

export default {
  name: 'App',
  components: {
    TrainingUploadImages
  }
}


</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

<template>
  <div class="hello">
    <h1>Set up {{task_name}} training data</h1>
    <h3>
        Labels
    </h3>
    <div v-for="label in task_labels" class="upload-labels" :key=label>
        <ImageUpload :label=label />
    </div>
    <button>
        Train
    </button>
  </div>
</template>

<script>
import Task from '../helpers/Task'
import ImageUpload from './ImageUpload'

export default {
  name: 'TrainingUploadImages',
  props: {
    msg: String,
    task_name: String,
    task_labels: Array[String],
    task: Task
  },
  components:{
      ImageUpload
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>

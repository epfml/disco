<template>
  <div class="hello">
    <h1>Set up {{task_name}} data</h1>
    <h3>
        Labels
    </h3>
    <form class="upload-images-form" onsubmit="return submitTrainingImages()">
        <div v-for="label in TaskStore.task_labels" class="upload-labels" :key=label>
            <h3>{{label}}</h3>
            <input type = "file">
        </div>
        <input type="submit" value="Join & Train" >
    </form>
  </div>
</template>

<script>
import Task from '../helpers/Task'
import TaskStore from '../store/taskStore'

export default {
  name: 'TrainingUploadImages',
  props: {
    msg: String,
    task: Task
  },
  data() {
    return {
      TaskStore: TaskStore.data
    }
  }
}


function submitTrainingImages(){
    alert("Form submitted")
    console.log("form submitted")
    return true
}

function nextScreen(){

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

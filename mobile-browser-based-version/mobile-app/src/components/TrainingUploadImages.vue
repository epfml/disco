<template>
  <div class="hello">
    <h1>Set up {{task_name}} data</h1>
    <h3>
        Labels
    </h3>
    <form class="upload-images-form" onsubmit="return submitTrainingImages()">
        <div v-for="label in task_labels" class="upload-labels" :key=label>
            <h3>{{label}}</h3>
            <input type = "file">
        </div>
        <input type="submit" value="Join & Train" >
    </form>
  </div>
</template>

<script>
import Task from '../helpers/Task'

export default {
  name: 'TrainingUploadImages',
  props: {
    msg: String,
    task: Task
  },
  task_labels: [0,1,2,3,4,5,6,7,8,9], 
  task_name: "MNIST"
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

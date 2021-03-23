<template>
  <div class="bg-purple text-white sm:bg-green md:bg-blue md:text-yellow lg:bg-red xl:bg-orange ...">
    Test
  </div>
  <div class="hello">
    <h1>Set up {{TaskStore.task_name}} data</h1>
    <h3>
        Labels
    </h3>
    <form class="upload-images-form" onsubmit="return submitTrainingImages()">
        <div v-for="label in TaskStore.task_labels" class="upload-labels" :key=label>
            <h3>{{label}}</h3>
            <input type = "file">
        </div>
        <input class= "btn bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center" type="button" value="Join & Train" v-on:click="train" >
    </form>
  </div>
</template>

<script>
import TaskStore from '../store/taskStore'

export default {
  name: 'TrainingUploadImages',
  props: {
    msg: String,
  },
  data() {
    return {
      TaskStore: TaskStore.data
    }
  },
  methods: {
    train(){
      console.log("Training")
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

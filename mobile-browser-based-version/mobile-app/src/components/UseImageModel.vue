<template>
  <div class="hello">
    <h1>Use {{TaskStore.task_name}} model</h1>
    <base-image-input />
    <button v-on:click="test">
        Test
    </button>
    <h3>
      {{predictedValue}}
    </h3>
  </div>
</template>

<script>
import * as tf from "@tensorflow/tfjs"
import * as imageRec from "@tensorflow-models/mobilenet"
import TaskStore from '../store/taskStore'
import BaseImageInput from '../components/BaseImageInput'
import ImageStore from '../store/imageStore'
export default {
  name: 'UseImageModel',
  props: {
    msg: String
  },
  data(){
    return{
      predictedValue:'Click on test!',
      TaskStore: TaskStore.data,
      ImageStore: ImageStore.data,
      tensorflowModel: null,
    }
  },
  methods:{
    async test(){
      this.tensorflowModel = await imageRec.load()
      console.log("Testing")
      console.log(this.ImageStore.image)
      const prediction =  await this.tensorflowModel.classify(this.ImageStore.image);
      console.log(prediction)
      this.predictedValue = prediction
    }
  },
  components:{
    BaseImageInput
  }
}

const loadModel = async ()=>{
  const recognizer = await imageRec.load();
  console.log("model loaded")
  this.tensorflowModel = recognizer
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

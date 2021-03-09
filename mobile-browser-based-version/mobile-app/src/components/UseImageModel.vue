<template>
  <div class="hello">
    <h1>Use {{task_name}} model</h1>
    <input type="file">
    <button>
        Test
    </button>
  </div>
</template>

<script>
export default {
  name: 'UseImageModel',
  props: {
    msg: String,
    task_name: String,
    task_labels: Array[String],
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

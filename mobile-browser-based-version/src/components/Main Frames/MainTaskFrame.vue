<template>
    <GlobalTaskFrame v-bind:Id="Id" v-bind:Task="Task" />
</template>

<script>
import GlobalTaskFrame from "../Building Frames/GlobalTaskFrame"
export default {
    name: "MainTaskFrame", 
    props: {
        Id: String,
        Task: Object,
    },
    components: {
        GlobalTaskFrame,
    }, 
}
</script>
<template>
    <!-- CSV tasks -->
    <!--TODO-->

    <!-- image tasks -->
    <div v-if='Task.training_information.data_type == "image"'>
        <ImageTestingFrame v-bind:Id="Id" v-bind:Task="Task" />
    </div>
</template>

<script>
import ImageTestingFrame from"../Building Frames/ImageTestingFrame"

export default {
    name:'MainTestingFrame',
    props: {
        Id: String,
        Task: Object
    }, 
    components: {
        ImageTestingFrame,
    }
}
</script>
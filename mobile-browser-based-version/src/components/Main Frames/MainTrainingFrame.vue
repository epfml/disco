<template>
    <!-- CSV tasks -->
    <div v-if='Task.training_information.data_type == "csv"'>
        <CsvTrainingFrame v-bind:Id="Id" v-bind:Task="Task" />
    </div>

    <!-- image tasks -->
    <div v-if='Task.training_information.data_type == "image"'>
        <ImageTrainingFrame v-bind:Id="Id" v-bind:Task="Task" />
    </div>
</template>

<script>
import CsvTrainingFrame from "../Building Frames/CsvTrainingFrame"
import ImageTrainingFrame from"../Building Frames/ImageTrainingFrame"

export default {
    name:'MainTrainingFrame',
    props: {
        Id: String,
        Task: Object
    }, 
    components: {
        CsvTrainingFrame,
        ImageTrainingFrame,
    }
}
</script>
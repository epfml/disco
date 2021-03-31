<template>
    <article aria-label="File Upload Modal" class="relative h-full flex flex-col bg-white rounded-lg dark:bg-darker" v-on:drop="dropHandler(event);" v-on:dragover="dragOverHandler(event)" v-on:dragleave="dragLeaveHandler(event)" v-on:dragenter="dragEnterHandler(event);">
        <!-- scroll area -->
        <section class="h-full overflow-auto p-8 w-full h-full flex flex-col">
             <h3 class="text-lg font-semibold text-gray-500 dark:text-light">
              {{label}}
            </h3>
            <header class="border-dashed border-2 border-gray-500 dark:border-primary py-12 flex flex-col justify-center items-center\">
                <p class="mb-3 text-lg font-semibold dark:text-lightflex flex-wrap justify-center\">
                    <span>Drag and drop your</span>&nbsp;<span>files anywhere or click to upload</span>
                </p>
                <input id="image-input" type="file" multiple v-on:change="individualInputChangeFunc" />
            </header>
        </section>
    </article>
</template>


<script>
export default {
    name: "ImageUploadFrame",
    props: {
        label: String,
        inputchangefunc: Function,
    },
    methods: {
        individualInputChangeFunc: function(e) {
            this.inputchangefunc(e, this.label);
        },
        onClickHandler(ev) {
            document.getElementById("image-input").click();
        },
        dropHandler(ev) {
            ev.preventDefault();
            for (const file of ev.dataTransfer.files) {
                this.inputchangefunc(gallery, file);
                overlay.classList.remove("draggedover");
                counter = 0;
            }
        },
        dragEnterHandler(e) {
            e.preventDefault();
            if (!hasFiles(e)) {
                return;
            }
            ++counter && overlay.classList.add("draggedover");
        },

        dragLeaveHandler(e) {
            1 > --counter && overlay.classList.remove("draggedover");
        },
        dragOverHandler(e) {
            if (hasFiles(e)) {
                e.preventDefault();
            }
        }
    },
};
const hasFiles = ({ dataTransfer: { types = [] } }) =>
  types.indexOf("Files") > -1;
const gallery = document.getElementById("gallery"),
  overlay = document.getElementById("overlay");
  let counter = 0;

</script>
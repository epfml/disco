<template>
  <!-- Upload File Card-->
  <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
    <div class="container mx-width lg h-full">
      <!-- Card header -->
      <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
        <div
          class="flex items-center justify-between p-4 border-b dark:border-primary"
        >
          <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
            Upload My Data
          </h4>
          <div class="flex items-center">
            <span aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                class="bi bi-cloud-upload w-7 h-7"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z"
                />
                <path
                  fill-rule="evenodd"
                  d="M7.646 4.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V14.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3z"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
      <div class="relative pb-4">
        <article
          aria-label="File Upload Modal"
          class="relative h-full flex flex-col p-4 bg-white rounded-lg dark:bg-darker"
          v-on:drop="dropHandler"
          v-on:dragover="dragOverHandler"
          v-on:dragleave="dragLeaveHandler"
          v-on:dragenter="dragEnterHandler"
        >
          
          
          <!-- scroll area -->
          <section class="h-full overflow-auto p-8 w-full h-full flex flex-col">
            <header
              class="border-dashed border-2 border-gray-500 dark:border-primary flex flex-col justify-center items-center"
            >
              <p
                class="mb-3 p-4 text-lg font-semibold dark:text-lightflex flex-wrap justify-center"
              >
                <span>Drag and drop your</span>&nbsp;<span
                  >files anywhere or</span
                >
              </p>
              <input v-bind:id="hiddenInput_name" type="file" multiple class="hidden" />
              <div class="p-4">
                <button
                  v-bind:id="uploadButton_name"
                  class="mt-2 p-2 rounded-sm text-white transition-colors duration-200 bg-primary hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark focus:outline-none focus:bg-primary-100 dark:focus:bg-primary-dark focus:ring-primary-darker"
                >
                  Upload files
                </button>
              </div>
            </header>

            <div class="pt-4">
              <h1
                class="pt-8 pb-3 font-semibold sm:text-lg dark:text-lightflex"
              >
                Files Selected
              </h1>

              <ul v-bind:id="gallery_name" class="flex flex-1 flex-wrap -m-1">
                <li
                  v-bind:id="empty_name"
                  class="h-full w-full text-center flex flex-col items-center justify-center items-center"
                >
                  <img
                    class="mx-auto w-32"
                    src="https://user-images.githubusercontent.com/507615/54591670-ac0a0180-4a65-11e9-846c-e55ffce0fe7b.png"
                    alt="no data"
                  />
                  <span class="text-small text-gray-500 dark:text-lightflex"
                    >No files selected</span
                  >
                </li>
              </ul>
            </div>
          </section>
        </article>
      </div>
    </div>
  </div>

  <!-- Upload File Data Template -->
  <template v-bind:id="fileTempl_name">
    <li class="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24">
      <article
        tabindex="0"
        class="group w-full h-full rounded-md focus:outline-none focus:shadow-outline elative bg-primary-100 dark:bg-dark focus-within:cursor-pointer relative shadow-sm"
      >
        <img
          alt="upload preview"
          class="img-preview hidden w-full h-full sticky object-cover rounded-md bg-fixed"
        />
        <section
          class="p-2 flex flex-col rounded-md text-xs break-words w-full h-full z-20 absolute top-0"
        >
          <h1 class="flex-1 text-gray-800 group-hover:text-primary dark:text-gray-50 dark:group-hover:text-primary"></h1>
          <div class="flex">
            <span class="p-1 text-gray-800 dark:text-gray-50">
              <i>
                <svg
                  class="fill-current w-4 h-4 ml-auto pt-1"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path d="M15 2v5h5v15h-16v-20h11zm1-2h-14v24h20v-18l-6-6z" />
                </svg>
              </i>
            </span>
            <p class="p-1 size text-xs text-gray-800 dark:text-gray-50"></p>
            <button
              class="delete ml-auto focus:outline-none hover:bg-white dark:hover:bg-gray-500 p-1 rounded-md text-gray-800 dark:text-gray-50"
            >
              <svg
                class="pointer-events-none fill-current w-4 h-4 ml-auto"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  class="pointer-events-none"
                  d="M3 6l3 18h12l3-18h-18zm19-4v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z"
                />
              </svg>
            </button>
          </div>
        </section>
      </article>
    </li>
  </template>

  <!-- Upload Image Data Template-->
  <template v-bind:id="imageTempl_name">
    <li class="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24">
      <article
        tabindex="0"
        class="group hasImage w-full h-full rounded-md focus:outline-none focus:shadow-outline bg-gray-100 cursor-pointer relative text-transparent hover:text-white shadow-sm"
      >
        <img
          alt="upload preview"
          class="img-preview w-full h-full sticky object-cover rounded-md bg-fixed"
        />

        <section
          class="flex flex-col rounded-md text-xs break-words w-full h-full z-20 absolute top-0 py-2 px-3"
        >
          <h1 class="flex-1"></h1>
          <div class="flex">
            <span class="p-1">
              <i>
                <svg
                  class="fill-current w-4 h-4 ml-auto pt-"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 8.5c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5c0 .829-.672 1.5-1.5 1.5s-1.5-.671-1.5-1.5zm9 .5l-2.519 4-2.481-1.96-4 5.96h14l-5-8zm8-4v14h-20v-14h20zm2-2h-24v18h24v-18z"
                  />
                </svg>
              </i>
            </span>

            <p class="p-1 size text-xs"></p>
            <button
              class="delete ml-auto focus:outline-none hover:bg-gray-300 p-1 rounded-md"
            >
              <svg
                class="pointer-events-none fill-current w-4 h-4 ml-auto"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  class="pointer-events-none"
                  d="M3 6l3 18h12l3-18h-18zm19-4v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z"
                />
              </svg>
            </button>
          </div>
        </section>
      </article>
    </li>
  </template>
</template>


<script>
let counter = 0;
let fileTempl = null;
let imageTempl = null;
let empty = null;

// use to store pre selected files
let FILES = {}; // Not used 
let gallery = null;
let hidden = null;

// use to check if a file is being dragged
const hasFiles = ({ dataTransfer: { types = [] } }) =>
  types.indexOf("Files") > -1;

export default {
  name: "CsvUploadFrame",
  props: {
    code_name: String,
  },
  data() {
    return {
      gallery_name: "gallery_".concat(this.code_name),
      fileTempl_name: "file-template_".concat(this.code_name),
      imageTempl_name: "image-template_".concat(this.code_name),
      empty_name: "empty_".concat(this.code_name),
      hiddenInput_name: "hidden-input_".concat(this.code_name),
      uploadButton_name: "uploadButton_".concat(this.code_name),
    }
  },
  methods: {
    addFile(target, file) {
      const isImage = file.type.match("image.*"),
        objectURL = URL.createObjectURL(file);

      const clone = isImage
        ? imageTempl.cloneNode(true)
        : fileTempl.cloneNode(true);

      clone.querySelector("h1").textContent = file.name;
      clone.querySelector("li").id = objectURL;
      clone.querySelector(".delete").dataset.target = objectURL;
      clone.querySelector(".size").textContent =
        file.size > 1024
          ? file.size > 1048576
            ? Math.round(file.size / 1048576) + "mb"
            : Math.round(file.size / 1024) + "kb"
          : file.size + "b";

      isImage &&
        Object.assign(clone.querySelector("img"), {
          src: objectURL,
          alt: file.name,
        });

      empty.classList.add("hidden");
      target.prepend(clone.firstElementChild);

      FILES[objectURL] = file;
    },

    // use to drag dragenter and dragleave events.
    // this is to know if the outermost parent is dragged over
    // without issues due to drag events on its children

    // reset counter and append file to gallery when file is dropped
    dropHandler(ev) {
      ev.preventDefault();
      for (const file of ev.dataTransfer.files) {
        this.addFile(gallery, file);
        counter = 0;
      }
    },

    // only react to actual files being dragged
    dragEnterHandler(e) {
      e.preventDefault();
      if (!hasFiles(e)) {
        return;
      }
      ++counter;
    },

    dragLeaveHandler(e) {
      1 > --counter;
    },

    dragOverHandler(e) {
      if (hasFiles(e)) {
        e.preventDefault();
      }
    },
  },
  mounted() {
    gallery = document.getElementById(this.gallery_name);
    fileTempl = document.getElementById(this.fileTempl_name);
    imageTempl = document.getElementById(this.imageTempl_name);
    empty = document.getElementById(this.empty_name);

    // click the hidden input of type file if the visible button is clicked
    // and capture the selected files
    hidden = document.getElementById(this.hiddenInput_name);
    document.getElementById(this.uploadButton_name).onclick = () => hidden.click();
    hidden.onchange = (e) => {
      for (const file of e.target.files) {
        this.addFile(gallery, file);
      }
    };

    // event delegation to caputre delete events
    // fron the waste buckets in the file preview cards
    gallery.onclick = ({ target }) => {
      if (target.classList.contains("delete")) {
        const ou = target.dataset.target;
        document.getElementById(ou).remove(ou);
        gallery.children.length === 1 && empty.classList.remove("hidden");
        delete FILES[ou];
      }
    };
  },
};
</script>
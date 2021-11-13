<!-- Upload File Data Template -->
<template>
  <div v-bind:id="id">
    <li class="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24">
      <article
        tabindex="0"
        :class="
          `${
            image
              ? 'hasImage bg-gray-100 cursor-pointer text-transparent hover:text-white'
              : 'bg-primary-100 dark:bg-dark focus-within:cursor-pointer'
          } group w-full h-full rounded-md focus:outline-none focus:shadow-outline elative bg-primary-100 relative shadow-sm`
        "
      >
        <img
          alt="upload preview"
          :class="
            `${
              image ? '' : 'hidden'
            } img-preview w-full h-full sticky object-cover rounded-md bg-fixed`
          "
        />
        <section
          :class="
            `${
              image ? 'py-2 px-3' : 'p-2'
            } flex flex-col rounded-md text-xs break-words w-full h-full z-20 absolute top-0`
          "
        >
          <h1
            :class="
              `${
                image
                  ? ''
                  : 'text-gray-800 group-hover:text-primary dark:text-gray-50 dark:group-hover:text-primary'
              } flex-1`
            "
          ></h1>
          <div class="flex">
            <span
              :class="`${image ? '' : 'text-gray-800 dark:text-gray-50'} p-1`"
            >
              <i><file /></i>
            </span>
            <p
              :class="
                `${
                  image ? '' : 'text-gray-800 dark:text-gray-50'
                } p-1 size text-xs`
              "
            ></p>
            <button
              :class="
                `${
                  image
                    ? 'hover:bg-gray-300'
                    : 'hover:bg-white dark:hover:bg-gray-500 text-gray-800 dark:text-gray-50'
                } delete ml-auto focus:outline-none p-1 rounded-md`
              "
            >
              <bin />
            </button>
          </div>
        </section>
      </article>
    </li>
  </div>
</template>
<script>
import Bin from "../../assets/svg/Bin.vue";
import File from "../../assets/svg/File.vue";

export default {
  components: { File, Bin },
  name: "file-data",
  props: {
    id: String,
    image: Boolean,
  },
};
</script>

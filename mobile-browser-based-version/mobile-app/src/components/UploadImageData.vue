<template>
     <li class="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24" :id="file_info.url">
          <article tabindex="0"
            class="group hasImage w-full h-full rounded-md focus:outline-none focus:shadow-outline bg-gray-100 cursor-pointer relative text-transparent hover:text-white shadow-sm">
            <img alt="upload preview" class="img-preview w-full h-full sticky object-cover rounded-md bg-fixed" :src="file_info.url"/>

            <section class="flex flex-col rounded-md text-xs break-words w-full h-full z-20 absolute top-0 py-2 px-3">
              <h1 class="flex-1">{{file_info.name}}</h1>
              <div class="flex">
                <span class="p-1">
                  <i>
                    <svg class="fill-current w-4 h-4 ml-auto pt-" xmlns="http://www.w3.org/2000/svg" width="24"
                      height="24" viewBox="0 0 24 24">
                      <path
                        d="M5 8.5c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5c0 .829-.672 1.5-1.5 1.5s-1.5-.671-1.5-1.5zm9 .5l-2.519 4-2.481-1.96-4 5.96h14l-5-8zm8-4v14h-20v-14h20zm2-2h-24v18h24v-18z" />
                    </svg>
                  </i>
                </span>

                <p class="p-1 size text-xs">{{file_info.size}}</p>
              </div>
            </section>
          </article>
        </li>
</template>

<script>
export default {
  name: 'UploadImageData',
  props: {
    file_info: Object,
  },
  methods: {
    train(){
      console.log("Training")
    }
  }
}
</script>

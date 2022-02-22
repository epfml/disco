<template>
  <testing-frame :id="id" :task="task" :helper="helper">
    <template v-slot:dataExample>
      <!-- Data Point Example -->
      <div class="flex object-center">
        <img
          class="object-center"
          :src="task.getExampleImage(task.displayInformation.dataExampleImage)"
          :alt="task.displayInformation.dataExampleImage"
        /><img />
      </div>
    </template>
    <template v-slot:extra></template>

    <template v-slot:predictionResults>
      <image-prediction-results-frame
        v-if="task.testing.gotResults"
        :classes="task.testing.classes"
      />

      <div id="predictions"></div>
      <!-- Upload Image Data Template-->
      <template id="image-template">
        <li class="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24">
          <article
            tabindex="0"
            class="
              group
              hasImage
              w-full
              h-full
              rounded-md
              focus:outline-none focus:shadow-outline
              bg-gray-100
              cursor-pointer
              relative
              text-transparent
              hover:text-white
              shadow-sm
            "
          >
            <img
              alt="upload preview"
              class="
                img-preview
                w-full
                h-full
                sticky
                object-cover
                rounded-md
                bg-fixed
              "
            />

            <section
              class="
                flex flex-col
                rounded-md
                text-xs
                break-words
                w-full
                h-full
                z-20
                absolute
                top-0
                py-2
                px-3
              "
            >
              <h1 class="flex-1"></h1>
              <div class="flex">
                <span class="p-1">
                  <i>
                    <picture-background />
                  </i>
                </span>

                <p class="p-1 size text-xs"></p>
                <button
                  class="
                    delete
                    ml-auto
                    focus:outline-none
                    hover:bg-gray-300
                    p-1
                    rounded-md
                  "
                >
                  <bin />
                </button>
              </div>
            </section>
          </article>
        </li>
      </template>
    </template>
  </testing-frame>
</template>

<script>
import TestingFrame from '../containers/TestingFrame.vue'
import ImagePredictionResultsFrame from './ImagePredictionResultsFrame.vue'
import PictureBackground from '../../../assets/svg/PictureBackground.vue'
import Bin from '../../../assets/svg/Bin.vue'
import { ImageTaskHelper } from '@/helpers/task_definition/image/helper'

export default {
  components: {
    TestingFrame,
    ImagePredictionResultsFrame,
    PictureBackground,
    Bin
  },
  props: {
    id: String,
    task: Object
  },
  data () {
    return {
      FILES: {},
      // helper
      helper: new ImageTaskHelper(this.task)
    }
  },
  async mounted () {
    // This method is called when the component is created
    this.$nextTick(async function () {
      // Code that will run only after the
      // entire view has been rendered
      /**
       * #######################################
       * LOAD INFORMATION ABOUT THE TASK
       * #######################################
       */

      const imageTempl = document.getElementById('image-template')
      const empty = document.getElementById('empty')
      function addFile (target, file) {
        const objectURL = URL.createObjectURL(file)
        const clone = imageTempl.cloneNode(true)
        clone.querySelector('h1').textContent = file.name
        clone.querySelector('li').id = objectURL
        clone.querySelector('.delete').dataset.target = objectURL
        clone.querySelector('.size').textContent =
          file.size > 1024
            ? file.size > 1048576
              ? Math.round(file.size / 1048576) + 'mb'
              : Math.round(file.size / 1024) + 'kb'
            : file.size + 'b'
        Object.assign(clone.querySelector('img'), {
          src: objectURL,
          alt: file.name
        })
        empty.classList.add('hidden')
        target.prepend(clone.firstElementChild)
      }
      const gallery = document.getElementById('gallery')
      const hidden = document.getElementById('hidden-input')
      document.getElementById('button').onclick = () => hidden.click()
      hidden.onchange = (e) => {
        for (const file of e.target.files) {
          addFile(gallery, file)
        }
      }
      /**
       * Returns the CSS colors graphs should be rendered in
       */
      const cssColors = (color) => {
        return getComputedStyle(document.documentElement).getPropertyValue(
          color
        )
      }
      /**
       * Returns the colors depending on user's choice graphs should be rendered in
       */
      const getColor = () => {
        return window.localStorage.getItem('color') ?? 'cyan'
      }
      // Initilization of the color's constant
      // TO DO: add listeners to modify color when changement added
      // eslint-disable-next-line no-unused-vars
      const colors = {
        primary: cssColors(`--color-${getColor()}`),
        primaryLight: cssColors(`--color-${getColor()}-light`),
        primaryLighter: cssColors(`--color-${getColor()}-lighter`),
        primaryDark: cssColors(`--color-${getColor()}-dark`),
        primaryDarker: cssColors(`--color-${getColor()}-darker`)
      }
    })
  }
}
</script>

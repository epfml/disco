<template>
  <testing-frame
    :Id="Id"
    :Task="Task"
    :nbrClasses="1"
    :makePredictions="makePredictions"
    :predictionsToCsv="predictionsToCsv"
  >
    <template v-slot:dataExample>
      <!-- Data Point Example -->
      <div class="relative p-4 overflow-x-scroll">
        <table class="table-auto">
          <thead>
            <tr>
              <th
                v-for="example in dataExample"
                :key="example"
                class="px-4 py-2 text-emerald-600"
              >
                {{ example.columnName }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                v-for="example in dataExample"
                :key="example"
                class="
                  border border-emerald-500
                  px-4
                  py-2
                  text-emerald-600
                  font-medium
                "
              >
                {{ example.columnData }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <template v-slot:extra>
      <!-- Modification of Header Card -->

      <icon-card header="Map My Data" :description="dataExampleText">
        <template v-slot:icon><bezier-2 /></template>
        <template v-slot:extra>
          <!-- Display all the possible headers -->
          <div id="mapHeader">
            <ul
              class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 xl:grid-cols-4"
            >
              <li
                class="border-gray-400"
                v-for="header in headers"
                :key="header.id"
              >
                <div
                  class="
                    select-none
                    p-2
                    transition
                    duration-500
                    ease-in-out
                    transform
                    hover:-translate-y-2
                    rounded-2xl
                    border-2
                    p-6
                    hover:shadow-2xl
                    border-primary-dark
                  "
                >
                  <div class="grid grid-cols-3 items-center p-2">
                    <div class="pl-1">
                      <div class="font-medium">
                        <div class="flex flex-row justify-start">
                          {{ header.id }}
                        </div>
                      </div>
                    </div>
                    <div>&larr;</div>
                    <div class="mb-3 pt-0">
                      <input
                        type="text"
                        v-model="header.userHeader"
                        placeholder="Enter your header"
                        class="
                          p-1
                          placeholder-gray-400
                          text-gray-700
                          dark:text-white
                          relative
                          bg-white
                          dark:bg-dark
                          rounded
                          text-sm
                          shadow
                          outline-none
                          focus:outline-none focus:shadow-outline
                          w-full
                        "
                      />
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </template>
      </icon-card>
    </template>
  </testing-frame>
</template>

<script>
import TestingFrame from '../containers/TestingFrame';
import IconCard from '../../containers/IconCard';
import Bezier2 from '../../../assets/svg/Bezier2';

export default {
  name: 'csv-testing-frame',
  props: {
    Id: String,
    Task: Object,
  },
  components: {
    IconCard,
    TestingFrame,
    Bezier2,
  },
  data() {
    return {
      // headers related to training task of containing item of the form {id: "", userHeader: ""}
      headers: [],
      predictions: null,
    };
  },

  methods: {
    async predictionsToCsv(predictions) {
      let pred = predictions.join('\n');
      const csvContent = this.classColumn + '\n' + pred;
      return csvContent;
    },
    async makePredictions(filesElement) {
      return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = async (e) => {
          // Preprocess the data and get object of the form {accepted: True/False, Xtrain: training data, ytrain: lavels}
          var predictions = await this.Task.predict(e, this.headers);
          resolve(predictions);
        };
        reader.readAsText(filesElement);
      });
    },
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function () {
      // initialize information variables
      this.classColumn = this.Task.trainingInformation.outputColumn;
      this.Task.displayInformation.headers.forEach((item) => {
        if (item !== this.classColumn) {
          this.headers.push({ id: item, userHeader: item });
        }
      });
      this.dataExample = this.Task.displayInformation.dataExample.filter(
        (item) => item.columnName !== this.classColumn
      );
    });
  },
};
</script>

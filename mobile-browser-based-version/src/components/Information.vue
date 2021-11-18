<template>
  <base-layout v-bind:withSection="true" customClass="pt-4">
    <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
      <!-- Titanic's card-->
      <card customClass="hover:text-primary dark:hover:text-light">
        <h6
          class="
            text-xl
            font-large
            leading-none
            tracking-wider
            dark:group-hover:text-darker
            px-2
            py-6
          "
        >
          Information
        </h6>
        <div class="ml-10">
          <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
            <!-- Titanic's card-->
            <card customClass="hover:text-primary dark:hover:text-light">
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  DeAI enables collaborative and privacy-preserving training of
                  machine learning models. DeAI is an easy-to-use mobile app &
                  web software, running directly in your browser.
                </ul>
              </div>
            </card>

            <card customClass="hover:text-primary dark:hover:text-light">
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  <b>Key Question:</b>
                  Can we keep control over our own data, while still benefitting
                  from joint collaborative training with other participants? -
                  or - Can we train a ML model which is equally good as if all
                  data were in one place, but respect privacy?
                </ul>
              </div>
            </card>

            <card customClass="hover:text-primary dark:hover:text-light">
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  <b>Decentralized learning:</b>
                  makes this possible, following the same principles as in
                  federated learning, but going one step further by removing any
                  central coordinator. DeAI only uses
                  <a class="text-blue-600" href="https://peerjs.com/"
                    >peer2peer</a
                  >
                  communication, while keeping your data local at all times. It
                  puts users in control of the entire collaborative training
                  process, without a central point of failure. We support a
                  variety of modern deep learning architectures running on
                  mobile device (currently via
                  <a class="text-blue-600" href="https://www.tensorflow.org/js"
                    >TF.js</a
                  >).
                </ul>
              </div>
            </card>

            <card customClass="hover:text-primary dark:hover:text-light">
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  <b>Science behind DeAI:</b>
                  In this project we aim to build and improve decentralized
                  versions of current machine learning algorithms, which are at
                  the same time (i) efficient (<a
                    class="text-blue-600"
                    href="https://github.com/epfml/powergossip"
                    >R1</a
                  >,<a
                    class="text-blue-600"
                    href="https://github.com/epfml/ChocoSGD"
                    >R2</a
                  >), (ii) privacy-preserving (<a
                    class="text-blue-600"
                    href="https://arxiv.org/abs/2006.04747"
                    >R3</a
                  >), (iii) fault-tolerant and dynamic over time (<a
                    class="text-blue-600"
                    href="https://arxiv.org/abs/1910.12308"
                    >R4</a
                  >), (iv) robust to malicious actors (<a
                    class="text-blue-600"
                    href="https://arxiv.org/abs/2012.10333"
                    >R5</a
                  >,<a
                    class="text-blue-600"
                    href="https://arxiv.org/abs/2006.09365"
                    >R6</a
                  >), and (iv) support fair incentives and transparency on the
                  resulting utility of trained ML models. We currently follow a
                  public model, private data approach.
                </ul>
              </div>
            </card>
          </div>

          <h6
            class="
              text-xl
              font-large
              leading-none
              tracking-wider
              dark:group-hover:text-darker
              px-2
              py-6
            "
          >
            Features
          </h6>
          <div class="ml-10">
            <div
              class="grid grid-cols-2 gap-4 p-4 lg:grid-cols-2 xl:grid-cols-2"
            >
              <!-- Titanic's card-->
              <card customClass="hover:text-primary dark:hover:text-light">
                <div class="ml-10">
                  <ul
                    class="text-lg ont-semibold text-gray-500 dark:text-light"
                  >
                    <b>Supports Deep Learning architectures</b>
                    Supports a high variety of neural network models for
                    training ranging from logistic regression to modern deep
                    learning architectures, and different data types ranging
                    from image classification to natural language processing.
                  </ul>
                </div>
              </card>

              <card customClass="hover:text-primary dark:hover:text-light">
                <div class="ml-10">
                  <ul
                    class="text-lg ont-semibold text-gray-500 dark:text-light"
                  >
                    <b>Data and model privacy</b>
                    Data privacy by design - no data ever leaves any device.
                    Models can be protected from access through passwords.
                  </ul>
                </div>
              </card>

              <card customClass="hover:text-primary dark:hover:text-light">
                <div class="ml-10">
                  <ul
                    class="text-lg ont-semibold text-gray-500 dark:text-light"
                  >
                    <b>Runs anywhere</b>
                    DeAI runs in the browser, from any device equipped with a
                    modern browser.
                  </ul>
                </div>
              </card>

              <card customClass="hover:text-primary dark:hover:text-light">
                <div class="ml-10">
                  <ul
                    class="text-lg ont-semibold text-gray-500 dark:text-light"
                  >
                    <b>Collaborative training</b>
                    Neural network training is done in a collaborative fashion,
                    through peer to peer communication neural network weights
                    are exchanged between participants, with the goal to train a
                    machine learning model that can achieve better
                    generalisation across different types of data, without ever
                    having had access to the data itself.
                  </ul>
                </div>
              </card>
            </div>
          </div>

          <h6
            class="
              text-xl
              font-large
              leading-none
              tracking-wider
              dark:group-hover:text-darker
              px-2
              py-6
            "
          >
            How to use
          </h6>
          <div class="ml-10">
            <div
              class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1"
            >
              <!-- Titanic's card-->
              <card customClass="hover:text-primary dark:hover:text-light">
                <div class="ml-10">
                  <ul
                    class="text-lg ont-semibold text-gray-500 dark:text-light"
                  >
                    <b>Step 1: Select a task</b>
                    - choose different tasks and data sets for training, ranging
                    from tabular data to images, and from binary classification
                    to class-wise prediction.
                  </ul>
                </div>
              </card>

              <card customClass="hover:text-primary dark:hover:text-light">
                <div class="ml-10">
                  <ul
                    class="text-lg ont-semibold text-gray-500 dark:text-light"
                  >
                    <b>Step 2: Select data for the training process </b>
                    - choose the files that are used for the training process on
                    your local devices. Those files will not be uploaded.
                  </ul>
                </div>
              </card>

              <card customClass="hover:text-primary dark:hover:text-light">
                <div class="ml-10">
                  <ul
                    class="text-lg ont-semibold text-gray-500 dark:text-light"
                  >
                    <b>Step 3: Neural network training </b>
                    - select between local training and distributed training.
                    Local training will fine tune the model with your local data
                    and the resulting model will only be available to your
                    device. Distributed training will allow communication
                    between local devices during training after every epoch so
                    the local models are aggregated into a global model.After
                    completing training, you can find training statistics on the
                    model accuracy in the dashboard. For distributed training,
                    details on the communication rounds will also appear on the
                    board.
                  </ul>
                </div>
              </card>

              <card customClass="hover:text-primary dark:hover:text-light">
                <div class="ml-10">
                  <ul
                    class="text-lg ont-semibold text-gray-500 dark:text-light"
                  >
                    <b>Step 4: Save the model </b>
                    - click on the button to save the model for later.
                  </ul>
                </div>
              </card>

              <card customClass="hover:text-primary dark:hover:text-light">
                <div class="ml-10">
                  <ul
                    class="text-lg ont-semibold text-gray-500 dark:text-light"
                  >
                    <b>Step 5: Reuse the model </b>
                    - come back any time to reuse your local model and resume
                    training or test it against other data.
                  </ul>
                </div>
              </card>
            </div>
          </div>
          <h6
            class="
              text-xl
              font-large
              leading-none
              tracking-wider
              dark:group-hover:text-darker
              p-2
              py-6
            "
          >
            Further links
          </h6>
          <ul class="text-lg ont-semibold text-gray-500 dark:text-light p-4">
            This app was developped in the Machine Learning and Optimization
            Laboratory at EPFL.
            <br />
            More information about decentralized learning
            <a
              href="https://www.epfl.ch/labs/mlo/"
              target="_blank"
              class="text-blue-500 hover:underline"
              >here</a
            >.
            <br />
            The source code of the app can be found on
            <a
              href="https://github.com/epfml/DeAI"
              target="_blank"
              class="text-blue-500 hover:underline"
              >Github</a
            >.
            <br />
            Finally, you can join our
            <a
              href="https://deai.slack.com/"
              target="_blank"
              class="text-blue-500 hover:underline"
              >Slack</a
            >
            page to discuss the app.
          </ul>
        </div>
      </card>
    </div>
  </base-layout>
</template>

<script>
import baseLayout from './containers/BaseLayout';
import card from './containers/Card';
export default {
  name: 'information',
  components: { baseLayout, card },
  methods: {
    goToLabPage() {},
  },
};
</script>

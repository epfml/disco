<template>
  <div>
    <input type="text" placeholder="Username" id="username" />
    <button v-on:click="register()">Register</button>
  </div>

  <div>
    <input type="text" placeholder="Receivers" id="receivers" />
    <button v-on:click="send()">Send</button>
  </div>

  <div>
    <button v-on:click="train()">Train</button>
  </div>
</template>


<script>
import Peer from "peerjs";
import {
  PeerJS,
  send_model,
  send_data,
  handle_data,
  CMD_CODES,
} from "../helpers/peer";

import {
  onEpochEnd_common,
  train_common,
  makeid,
} from "../helpers/helpers";

import * as tf from "@tensorflow/tfjs";

var model = null;

export default {
  data() {
    return {
      peerjs: null,
     // model: null,
      receivers: [],
      recv_buffer: {
        train_info: {
          epochs: 5,
        },
      },
      epoch: 0,
      username: null,
      threshold: null,
      model_compile_data: {
        optimizer: "sgd",
        loss: "categoricalCrossentropy",
        metrics: ["accuracy"],
      },
      model_train_data: {
        epochs: 5,
      },
    };
  },
  methods: {
    async register() {
      this.username = document.getElementById("username").value;

      var peer = new Peer(this.username, {
        host: "localhost",
        port: 9000,
        path: "/myapp",
      });
      this.peerjs = new PeerJS(peer, handle_data, this.recv_buffer);

      this.receivers = document.getElementById("receivers").value.split(",");
      this.threshold = Math.min(Math.ceil(this.receivers.length / 2), 5);
      console.log("Threshold: ", this.threshold);
    },
    async send() {
      var name = makeid(10); // random string
      console.log(CMD_CODES)
      //console.log(name)
      
      //await model.save("localstorage://" + name)
      //console.log("model saved")
      console.log(this.receivers)
      for (var i in this.receivers) {
        
        console.log("Start Sending Model")
        await send_model(model, this.peerjs, this.receivers[i], name);
        console.log("Model Sent")

        
        await send_data(
          this.model_compile_data,
          CMD_CODES.COMPILE_MODEL,
          this.peerjs,
          this.receivers[i]
        );
        await send_data(
          this.model_train_data,
          CMD_CODES.TRAIN_INFO,
          this.peerjs,
          this.receivers[i]
        );
        console.log('Data Sucessfully Sent')
      }
    },
    onEpochBegin() {
      console.log("EPOCH: ", ++this.epoch);
    },
    async onEpochEnd() {
      await onEpochEnd_common(
        model,
        this.epoch,
        this.receivers,
        this.recv_buffer,
        this.username,
        this.threshold,
        this.peerjs
      );
      // await onEpochEnd_Sync(model, epoch, receivers, recv_buffer) // synchronized communication scheme
    },
    async train(){
        train_common(model, this.model_compile_data, this.model_train_data, this.onEpochBegin, this.onEpochEnd)
    },
  },
  mounted() {
    model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [784], units: 32, activation: "relu" }),
        tf.layers.dense({ units: 10, activation: "softmax" }),
      ],
    });

    model.save("localstorage://" + "test")

    
  },
};
</script>
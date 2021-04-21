<template>
  <div>
    <input type="text" placeholder="Username" id="username" />
    <button v-on:click="register()">Register</button>
  </div>

  <div>
    <input type="text" placeholder="Receivers" id="receivers" />
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
  load_model,
  handle_data,
  handle_data_end,
} from "../helpers/peer";

import {
  data_received,
  onEpochEnd_common,
  train_common,
} from "../helpers/helpers";


var model = null;
var recv_buffer = {};

export default {
  data() {
    return {
      peerjs: null,
      receivers: [],
      epoch: 0,
      username: null,
      threshold: null,
    };
  },
  methods: {
    async register() {
      this.username = document.getElementById("username").value;
      this.receivers = document.getElementById("receivers").value.split(",");
      this.threshold = Math.min(Math.ceil(this.receivers.length / 2), 5);

      var peer = new Peer(this.username, {
        host: "localhost",
        port: 9000,
        path: "/myapp",
      });
    this.peerjs = new PeerJS(peer, handle_data, recv_buffer);

      // wait to receive data

      data_received(recv_buffer, "model")
        .then(() => data_received(recv_buffer, "compile_data"))
        .then(() => data_received(recv_buffer, "train_info"))
        .then(async () => {
          console.log(recv_buffer.model)
          model = await load_model(recv_buffer.model);
        })
        .then(() => {
          model.compile(recv_buffer.compile_data);
          console.log("Model: ", model);
          console.log("Train info: ", recv_buffer.train_info);
        });
    },
    onEpochBegin() {
      console.log("EPOCH: ", ++this.epoch);
    },
    async onEpochEnd() {
      await onEpochEnd_common(
        model,
        this.epoch,
        this.receivers,
        recv_buffer,
        this.username,
        this.threshold, 
        this.peerjs,
      );
      // await onEpochEnd_Sync(model, epoch, receivers, recv_buffer) // synchronized communication scheme
    },

    async train() {
      train_common(
        model,
        recv_buffer.compile_data,
        recv_buffer.train_info,
        this.onEpochBegin,
        this.onEpochEnd
      );
    },
  },
};
</script>
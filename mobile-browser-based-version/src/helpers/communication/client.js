export class Client {
  constructor(serverURL, task) {
    this.serverURL = serverURL;
    this.task = task;
  }

  async connect() {
    throw new Error('Abstract method');
  }

  async disconnect() {
    throw new Error('Abstract method');
  }

  async onEpochBeginCommunication() {
    return;
  }

  async onEpochEndCommunication() {
    return;
  }
}

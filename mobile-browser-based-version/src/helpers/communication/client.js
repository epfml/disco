import DecentralizedClient from './decentralised/client';
import FederatedClient from './federated/client';

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

  static getClient(platform, task, ...params) {
    switch (platform) {
      case 'decentralized':
        return new DecentralizedClient(
          process.env.DEAI_SERVER_URI,
          task,
          ...params
        );
      case 'federated':
        return new FederatedClient(
          process.env.FEAI_SERVER_URI,
          task,
          ...params
        );
      default:
        throw new Error('Platform does not exist');
    }
  }
}

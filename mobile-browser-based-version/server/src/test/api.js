import fetch from 'node-fetch';
import * as config from '../../server.config.js';
import { craftAPIRequest } from './helpers.js';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';

const API = `${config.SERVER_URI}:${config.SERVER_PORT}/feai`;

export async function connect(taskID, clientID) {
  return await fetch(`${API}/connect/${taskID}/${clientID}`);
}

export async function disconnect(taskID, clientID) {
  return await fetch(`${API}/disconnect/${taskID}/${clientID}`);
}

export async function selectionStatus(taskID, clientID) {
  return await fetch(`${API}/selection_status/${taskID}/${clientID}`);
}

export async function fetchModel(taskID) {
  return await tf.loadLayersModel(`${API}/tasks/${taskID}/model.json`);
}

export async function queryLogs(taskID, round, clientID) {
  const params = [];
  if (taskID !== undefined) params.push(`taskID=${taskID}`);
  if (round !== undefined) params.push(`round=${round}`);
  if (clientID !== undefined) params.push(`id=${clientID}`);
  const query = 'logs?'.concat(params.join('&'));
  return await fetch(`${API}/${query}`);
}

export async function sendWeights(taskID, round, clientID, weights) {
  const request = craftAPIRequest(clientID, 'weights', weights);
  return await fetch(`${API}/send_weights/${taskID}/${round}`, request);
}

export async function aggregationStatus(taskID, round, clientID, epoch) {
  const request = craftAPIRequest(clientID, 'epoch', epoch);
  return await fetch(`${API}/aggregation_status/${taskID}/${round}`, request);
}

export async function sendSamples(taskID, round, clientID, samples) {
  const request = craftAPIRequest(clientID, 'samples', samples);
  return await fetch(`${API}/send_samples/${taskID}/${round}`, request);
}

export async function samplesMap(taskID, round, clientID) {
  const request = craftAPIRequest(clientID);
  return await fetch(`${API}/receive_samples/${taskID}/${round}`, request);
}

import fetch from 'node-fetch';
import * as config from '../../server.config.js';
import { craftPostRequest } from './helpers.js';
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
  return await fetch(`${API}/selection/${taskID}/${clientID}`);
}

export async function aggregationStatus(taskID, round, clientID) {
  return await fetch(`${API}/aggregation/${taskID}/${round}/${clientID}`);
}

export async function getLatestModel(taskID) {
  return await tf.loadLayersModel(`${API}/tasks/${taskID}/model.json`);
}

export async function queryLogs(taskID, round, clientID) {
  const params = [];
  if (taskID !== undefined) params.push(`task=${taskID}`);
  if (round !== undefined) params.push(`round=${round}`);
  if (clientID !== undefined) params.push(`id=${clientID}`);
  const query = params.join('&');
  return await fetch(`${API}/logs?${query}`);
}

export async function postWeights(taskID, round, clientID, weights) {
  const request = craftPostRequest('weights', weights);
  return await fetch(`${API}/weights/${taskID}/${round}/${clientID}`, request);
}

export async function postMetadata(
  taskID,
  round,
  clientID,
  metadataID,
  metadata
) {
  const request = craftPostRequest(metadataID, metadata);
  return await fetch(
    `${API}/metadata/${metadataID}/${taskID}/${round}/${clientID}`,
    request
  );
}

export async function getMetadataMap(taskID, round, clientID, metadataID) {
  return await fetch(
    `${API}/metadata/${metadataID}/${taskID}/${round}/${clientID}`
  );
}

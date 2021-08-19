/**
 * Script used to load and save serialized model from tensor's flow database
 */

import * as tf from '@tensorflow/tfjs';

const databaseName = 'tensorflowjs';

/**
 * Creates the tensorflow's IndexedDB database
 */
async function createTensorflowDatabase() {
  // for now make it simple: create a very simple model and save it
  let initialModel = tf.sequential();
  await initialModel.save('indexeddb://initial-model');
}

/**
 * Initializes tensorflow's database
 * @returns
 */
export async function initializeIndexedDB() {
  return new Promise((resolve, reject) => {
    // Force the creation of the tensorflow database
    createTensorflowDatabase();

    // Test if the tensorflow database has been created
    let request = indexedDB.open('tensorflowjs');
    request.onsuccess = function() {
      console.log('Tensorflow database created');
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

/**
 * Store TFJS model in LocalStorage.
 * @param {TFJS model} model
 * @param {String} name name of model to store (can be anything)
 */
export async function storeModel(model, name) {
  const savePathDb = 'indexeddb://'.concat(name);
  await model.save(savePathDb);
  //await model.save("localstorage://" + name)
}

export async function getModelInfo(modelName) {
  return new Promise((resolve, reject) => {
    let openRequest = indexedDB.open(databaseName);
    openRequest.onsuccess = function() {
      let db = openRequest.result;

      // get the store object to access the database
      let txModelInfoStore = db.transaction('model_info_store');
      let stModelInfoStore = txModelInfoStore.objectStore('model_info_store');

      let getModelInfoRequest = stModelInfoStore.get(modelName);
      getModelInfoRequest.onsuccess = function() {
        resolve(getModelInfoRequest.result);
      };
      getModelInfoRequest.onerror = function() {
        reject(getModelInfoRequest.error);
      };
    };
    openRequest.onerror = function() {
      reject(openRequest.error);
    };
  });
}

/**
 * Get seralized data from tensorflow's IndexedDB database
 * @param {String} modelName the model name
 * @returns an object of the form {"modelInfo": , "modelData": }
 */
export async function getSerializedModel(modelName) {
  return new Promise((resolve, reject) => {
    let openRequest = indexedDB.open(databaseName);
    openRequest.onsuccess = function() {
      let db = openRequest.result;

      // get the store object to access the database
      let txModelInfoStore = db.transaction('model_info_store');
      let stModelInfoStore = txModelInfoStore.objectStore('model_info_store');

      // get the model's information
      var serializedModel = { modelInfo: null, modelData: null };

      let getModelInfoRequest = stModelInfoStore.get(modelName);
      getModelInfoRequest.onsuccess = function() {
        serializedModel.modelnfo = getModelInfoRequest.result;
        let txModelStore = db.transaction('models_store');
        let stModelStore = txModelStore.objectStore('models_store');
        let getModelDataRequest = stModelStore.get(modelName);
        getModelDataRequest.onsuccess = function() {
          serializedModel.modelData = getModelDataRequest.result;
          resolve(serializedModel);
        };
        getModelDataRequest.onerror = function() {
          reject(getModelDataRequest.error);
        };
      };
      getModelInfoRequest.onerror = function() {
        reject(getModelInfoRequest.error);
      };
    };
    openRequest.onerror = function() {
      reject(openRequest.error);
    };
  });
}

/**
 * Injects in tensorflow's associated database a new model
 * @param {String} modelName the name of the model to create
 * @param {Object} modelInfo tensorflow's model information (see tensorflow documentation for details)
 * @param {Object} modelData tensorflow's model data (see tensorflow documentation for details)
 * @returns
 */
export async function storeSerializedModel(modelInfo, modelData) {
  return new Promise((resolve, reject) => {
    let openRequest = indexedDB.open(databaseName);
    openRequest.onsuccess = function() {
      let db = openRequest.result;

      // get the store object to access the database
      let txModelInfoStore = db.transaction('model_info_store', 'readwrite');
      let stModelInfoStore = txModelInfoStore.objectStore('model_info_store');

      // inject the information
      console.log(modelData);
      console.log(Object.assign({}, modelData));
      let setModelInfoRequest = stModelInfoStore.put(
        Object.assign({}, modelInfo)
      ); // Get target of Proxy
      setModelInfoRequest.onsuccess = function() {
        let txModelStore = db.transaction('models_store', 'readwrite');
        let stModelStore = txModelStore.objectStore('models_store');
        let setModelDataRequest = stModelStore.put(
          Object.assign({}, modelData)
        );
        setModelDataRequest.onsuccess = function() {
          resolve();
        };
        setModelDataRequest.onerror = function() {
          reject(setModelDataRequest.error);
        };
      };
      setModelInfoRequest.onerror = function() {
        reject(setModelInfoRequest.error);
      };
    };
    openRequest.onerror = function() {
      reject(openRequest.error);
    };
  });
}

// TO DO: implement model removal

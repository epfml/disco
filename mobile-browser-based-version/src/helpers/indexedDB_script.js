
/**
 * Script used to load and save serialized model from tensor's flow database 
 */


import * as tf from "@tensorflow/tfjs";

const database_name = 'tensorflowjs';

/**
 * Creates the tensorflow's IndexedDB database
 */
async function create_tensorflow_database() {
    // for now make it simple: create a very simple model and save it 
    let initial_model = tf.sequential();
    await initial_model.save('indexeddb://initial-model');
}

/**
 * Initializes tensorflow's database 
 * @returns 
 */
export async function initialize_indexedDB() {
    return new Promise((resolve, reject) => {
        // Force the creation of the tensorflow database 
        create_tensorflow_database();

        // Test if the tensorflow database has been created 
        let request = indexedDB.open("tensorflowjs")
        request.onsuccess = function () {
            console.log("Tensorflow database created")
            resolve(request.result)
        }

        request.onerror = function () {
            reject(request.error)
        }
    })
}

/**
     * Store TFJS model in LocalStorage.
     * @param {TFJS model} model 
     * @param {String} name name of model to store (can be anything)
     */
export async function store_model(model, name) {
    const save_path_db = "indexeddb://".concat(name);
    await model.save(save_path_db);
    //await model.save("localstorage://" + name)
}

export async function get_model_info(model_name) {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(database_name)
        openRequest.onsuccess = function () {
            let db = openRequest.result

            // get the store object to access the database
            let txModelInfoStore = db.transaction('model_info_store')
            let stModelInfoStore = txModelInfoStore.objectStore('model_info_store')

            let getModelInfoRequest = stModelInfoStore.get(model_name)
            getModelInfoRequest.onsuccess = function () {
                resolve(getModelInfoRequest.result)
            }
            getModelInfoRequest.onerror = function () {
                reject(getModelInfoRequest.error)
            }
        }
        openRequest.onerror = function () {
            reject(openRequest.error)
        }
    })
}

/**
 * Get seralized data from tensorflow's IndexedDB database 
 * @param {String} model_name the model name 
 * @returns an object of the form {"model_info": , "model_data": }
 */
export async function get_serialized_model(model_name) {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(database_name)
        openRequest.onsuccess = function () {
            let db = openRequest.result

            // get the store object to access the database
            let txModelInfoStore = db.transaction('model_info_store')
            let stModelInfoStore = txModelInfoStore.objectStore('model_info_store')


            // get the model's information
            var serialized_model = { "model_info": null, "model_data": null }

            let getModelInfoRequest = stModelInfoStore.get(model_name)
            getModelInfoRequest.onsuccess = function () {
                serialized_model.model_info = getModelInfoRequest.result
                let txModelStore = db.transaction('models_store')
                let stModelStore = txModelStore.objectStore('models_store')
                let getModelDataRequest = stModelStore.get(model_name)
                getModelDataRequest.onsuccess = function () {
                    serialized_model.model_data = getModelDataRequest.result
                    resolve(serialized_model)
                }
                getModelDataRequest.onerror = function () {
                    reject(getModelDataRequest.error)
                }

            }
            getModelInfoRequest.onerror = function () {
                reject(getModelInfoRequest.error)
            }


        }
        openRequest.onerror = function () {
            reject(openRequest.error)
        }
    })
}

/**
 * Injects in tensorflow's associated database a new model
 * @param {String} model_name the name of the model to create 
 * @param {Object} model_info tensorflow's model information (see tensorflow documentation for details)
 * @param {Object} model_data tensorflow's model data (see tensorflow documentation for details)
 * @returns 
 */
export async function store_serialized_model(model_info, model_data) {
    return new Promise((resolve, reject) => {
        let openRequest = indexedDB.open(database_name)
        openRequest.onsuccess = function () {
            let db = openRequest.result

            // get the store object to access the database
            let txModelInfoStore = db.transaction('model_info_store', 'readwrite')
            let stModelInfoStore = txModelInfoStore.objectStore('model_info_store')


            // inject the information
            console.log(model_data)
            console.log(Object.assign({}, model_data))
            let setModelInfoRequest = stModelInfoStore.put(Object.assign({}, model_info)) // Get target of Proxy
            setModelInfoRequest.onsuccess = function () {
                let txModelStore = db.transaction('models_store', 'readwrite')
                let stModelStore = txModelStore.objectStore('models_store')
                let setModelDataRequest = stModelStore.put(Object.assign({}, model_data))
                setModelDataRequest.onsuccess = function () {
                    resolve()
                }
                setModelDataRequest.onerror = function () {
                    reject(setModelDataRequest.error)
                }
            }
            setModelInfoRequest.onerror = function () {
                reject(setModelInfoRequest.error)
            }



        }
        openRequest.onerror = function () {
            reject(openRequest.error)
        }
    })
}

// TO DO: implement model removal 



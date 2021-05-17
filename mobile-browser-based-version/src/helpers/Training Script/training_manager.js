import { training, training_distributed } from "./training-script";
import { store_model } from "../Memory Script/indexedDB_script";
import * as tf from "@tensorflow/tfjs";
import { onEpochEnd_common } from "../Communication Script/helpers";

/**
 * Class that deals with the model of a task.
 * Takes care of memory management of the model and the training of the model. 
 */
export class TrainingManager {
    /**
     * 
     * @param {Object} training_information the training information that can be found in script of the task.
     */
    constructor(training_information) {
        this.training_information = training_information;
        this.model = null;
        this.model_compile_data = training_information.model_compile_data;
        this.communication_manager = null;
        this.training_informant = null;
        this.environment = null;

        // current epoch of the model
        this.myEpoch = 0;
    }

    /**
     * Train the task's model either alone or in a distributed fashion depending on the user's choice. 
     * @param {Boolean} distributed     boolean to states if training alone or training in a distributed fashion.
     * @param {Object} processed_data   data that has been processed by the custom function define in the script of the task. Has the form {accepted: _, Xtrain: _, yTrain:_}.
     */
    async train_model(distributed, processed_data) {
        var accepted = processed_data.accepted;
        var Xtrain = processed_data.Xtrain;
        var ytrain = processed_data.ytrain;
        if (accepted) {
            // notify the user that training has started
            this.environment.$toast.success(
                `Thank you for your contribution. Training has started`
            );
            setTimeout(this.environment.$toast.clear, 30000);
            if (!distributed) {
                await training(
                    this.model,
                    Xtrain,
                    ytrain,
                    this.training_information.batch_size,
                    this.training_information.validation_split,
                    this.training_information.epoch,
                    this.training_informant
                );
            } else {
                await this.communication_manager.updateReceivers();
                await training_distributed(
                    this.model,
                    Xtrain,
                    ytrain,
                    this.training_information.epoch,
                    this.training_information.batch_size,
                    this.training_information.validation_split,
                    this.training_information.model_compile_data,
                    this,
                    this.communication_manager.peerjs,
                    this.communication_manager.recv_buffer
                );
            }
            // notify the user that training has ended 
            this.environment.$toast.success(
                this.training_information.model_id.concat(` has finished training!`)
            );
            setTimeout(this.environment.$toast.clear, 30000);
        }
    }

    /**
     * Method called at the begining of each training epoch.
     */
    onEpochBegin() {
        // To be modified in future ...
        // myEpoch will be removed 
        console.log("EPOCH: ", ++this.myEpoch);
    }

    /**
     * Method called at the end of each epoch.
     * Configured to handle communication with peers.
     * @param {Number} epoch The epoch number of the current training
     * @param {Number} _accuracy The accuracy achieved by the model in the given epoch
     * @param {Number} validationAccuracy The validation accuracy achieved by the model in the given epoch
     */
    async onEpochEnd(epoch, accuracy, validationAccuracy) {
        this.training_informant.updateCharts(
            epoch,
            validationAccuracy,
            accuracy
        );
        // At the moment, don't allow for new participants to come in.
        // Wait for a synchronization scheme (on epoch number).
        await this.communication_manager.updateReceivers();
        await onEpochEnd_common(
            this.model,
            epoch,
            this.communication_manager.receivers,
            this.communication_manager.recv_buffer,
            this.communication_manager.peerjs_id,
            this.training_information.threshold,
            this.communication_manager.peerjs,
            this.training_informant
        );
    }

    /**
     * Save the working model for later use. 
     */
    save_model() {
        store_model(this.model, "saved_".concat(this.training_information.model_id));
        this.environment.$toast.success(
            "The ".concat(this.training_information.model_id).concat(" has been saved.")
        );
        setTimeout(this.environment.$toast.clear, 30000);
    }

    /**
     * Initialize the communication manager (used when training with other peers)
     * @param {CommunicationManager} communication_manager the communication manager of the task.
     */
    initialize_communication_manager(communication_manager) {
        this.communication_manager = communication_manager
    }

    /**
     * Initialize the training informant (used to collect feed-backs from the training loop).
     * @param {TrainingInformant} training_informant the training informant of the task. 
     */
    initialize_training_informant(training_informant) {
        this.training_informant = training_informant
    }

    /**
     * Load the working model into the variable model. 
     */
    async initialize_model() {
        const saved_model_path = "indexeddb://working_".concat(
            this.training_information.model_id
        );
        this.model = await tf.loadLayersModel(saved_model_path);
    }

    /**
     * Initialize the component's environment (used to be able to send toast notifcation to user).
     * @param {*} environment the environment of the component to which the training manager is associated.
     */
    initialize_environment(environment) {
        this.environment = environment;
    }

    /**
     * Global initialization process of the training manger.
     * @param {*} communication_manager the communication manager of the task.
     * @param {*} training_informant the training informant of the task. 
     * @param {*} environment the environment of the component to which the training manager is associated.
     */
    async initialization(communication_manager, training_informant, environment) {
        await this.initialize_model();
        this.initialize_communication_manager(communication_manager);
        this.initialize_training_informant(training_informant);
        this.initialize_environment(environment);
    }
}
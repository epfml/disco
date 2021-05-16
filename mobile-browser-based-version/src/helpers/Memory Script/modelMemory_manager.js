import * as tf from "@tensorflow/tfjs";
import { get_model_info } from "./indexedDB_script";


export class ModelMemoryManager {
    /**
     * 
     * @param {Component} environment the component to which the ModelMemoryManager is attached.
     * @param {String} model_id the model's identification number.
     * @param {Function} create_new_model funciton to create a new model.
     */
    constructor(environment, model_id, create_new_model) {
        this.model_id = model_id
        this.environment = environment;
        this.save_model_exists = false; // to be modified
        this.ready_to_trian = false;
        this.choice_new_model = false;
        this.choice_pre_model = false;
        this.date_saved = "";
        this.hour_saved = "";
        this.isDark = this.getTheme();
        this.saved_model = null;
        this.create_new_model = create_new_model;
    }

    async initialize_modelMemoryManager() {
        let save_name = "saved_".concat(this.model_id);
        let model_info = await get_model_info(save_name);

        if (model_info != undefined) {
            const saved_model_path = "indexeddb://".concat(save_name);
            this.saved_model = await tf.loadLayersModel(saved_model_path);
            if (this.saved_model != null) {
                let date = model_info.modelArtifactsInfo.dateSaved;
                this.date_saved =
                    date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear();
                this.hour_saved = date.getHours() + "h" + date.getMinutes();
                this.saved_model_exists = true;
            }
        }
    }

    // Check if the window object exists 
    getTheme() {
        if (window.localStorage.getItem("dark")) {
            return JSON.parse(window.localStorage.getItem("dark"));
        }
        return (
            !!window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
        );
    }

    goToTraining() {
        if (!this.ready_to_train) {
            this.environment.$toast.error("Error. Please choose a model before training");
            setTimeout(this.environment.$toast.clear, 30000);
        } else {
            this.environment.$router.push({ path: "/".concat(this.model_id).concat("/training") });
        }
    }

    async deleteModel() {
        console.log("Delete Model")
        this.saved_model_exists = false
        await tf.io.removeModel('indexeddb://saved_'.concat(this.model_id));
    }
    async optionNewModel() {
        this.choice_new_model = !this.choice_new_model;
        if (this.choice_new_model) {
            await this.create_new_model();
            this.ready_to_train = true;

            this.environment.$toast.success(
                "A new "
                    .concat(this.model_id)
                    .concat(` has been createded. You can start training!`)
            );
            setTimeout(this.environment.$toast.clear, 30000);
        }
    }

    async optionPrevModel() {
        this.choice_pre_model = !this.choice_pre_model;
        if (this.choice_pre_model) {
            await this.load_saved_model();
            this.ready_to_train = true;

            this.$toast.success(
                "The "
                    .concat(this.model_id)
                    .concat(` has been loaded. You can start training!`)
            );
            setTimeout(this.$toast.clear, 30000);
        }
    }

    async load_saved_model() {
        const save_path_db = "indexeddb://working_".concat(
            this.model_id
        );
        await this.saved_model.save(save_path_db);
    }

    // To change => put in the script of the titanic 

}
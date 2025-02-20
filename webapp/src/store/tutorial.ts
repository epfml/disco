import { ref } from "vue";
import { defineStore } from "pinia";
import { useRouter } from "vue-router";

import { scrollToTop } from "@/utils";
import { useTrainingStore } from "./training";

import type { DriveStep, Driver } from "driver.js";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";


/**
 * The tutorial displays a series over overlays guiding the user through the Disco workflow, 
 * from the task page to connecting data, training model and evaluating it.
 * The tutorial is triggered on the first visit to the task page.
 * It can also be started manually by clicking on the help button in the sidebar.
 */
export const useTutorialStore = defineStore("guide", () => {
  // Flag to indicate if the tutorial has been shown
  const hasAlreadyBeenShown = ref(false);
  
  const driverObj = driver({
    showProgress: false,
    smoothScroll: true,
    disableActiveInteraction: true,
    showButtons: ["next", "close"],
  });

  const trainingStore = useTrainingStore();
  const router = useRouter();
  // Set the steps for the tutorial
  // Note: The tutorial interacts with the router and the training store
  driverObj.setSteps(getTaskSteps(driverObj));

  function startOnFirstVisit(): void {
    // Check if the tutorial has already been shown
    if (hasAlreadyBeenShown.value) return;
    start(false);
  }

  function startFromSidebar(): void {
    start(true);
  }

  
  function start(skipFirstStep: boolean = false): void {
    if (router.currentRoute.value.path !== "/list") {
      router.push({path: "/list"});
    }
    scrollToTop();
    driverObj.drive(skipFirstStep ? 1 : 0);
    hasAlreadyBeenShown.value = true;
  }

  function getTaskSteps(
    driverObj: Driver,
  ): DriveStep[] {

    const steps: DriveStep[] = [
      {
        element: "#tuto-help-bttn",
        popover: {
          title: "First time here?",
          description: "Would you like a quick tour of DISCO? You can always come back to this tutorial by clicking on the help button.",
          align: "end",
        },
      },
      {
        popover: {
          title: "Welcome to DISCO!",
          description: "This is a collaborative platform for training machine learning models while keeping your data private. You can use the side bar to navigate through the website.",
          align: "start",
        },
      },
      {
        element: "#llm_task",
        popover: {
          title: "Join existing DISCOllaboratives",
          description: "DISCOllaboratives are ML tasks like image recognition, LLM training, etc., that let users collaboratively train ML models without sharing data private.",
          align: "start",
        },
      },
      {
        element: "#tuto-create-bttn",
        popover: {
          title: "Create your own",
          description: "Create a DISCOllaborative by defining the ML task and base model so that other users can join and contribute.",
          align: "start",
        },
      },
      {
        element: "#tuto-evaluate-bttn",
        popover: {
          title: "The Model Library",
          description: "Download or load models you've trained to use or evaluate them.",
          align: "start",
        },
      },
      {
        element: "#lus_covid",
        popover: {
          title: "Let's check out a DISCOllaborative!",
          description: "Let's see how to join an existing DISCOllaborative with the LUS COVID task.",
          align: "start",
          side: "right",
          onNextClick: async () => {
            await router.push('/lus_covid');
            driverObj.moveNext();
          },
        },
      },
      {
        popover: {
          title: "Task Overview",
          description: "Here you can find a description of the task as well as the model being trained.",
        },
      },
      {
        element: "#tuto-training-bar",
        popover: {
          title: "Only 3 steps",
          description: "There are mainly 3 steps in a DISCOllaborative: connect your data, join the training session, and then you can use the model. Let's now get some data!",
          align: "center",
          onNextClick: () => {
            trainingStore.setStep(2);
            driverObj.moveNext();
          },
        },
      },
      {
        element: ".tuto-data-desc",
        popover: {
          title: "Expected Data Format",
          description: "This page describes what kind of data can be used to train the model. This is where you can connect your data. Note that data connected here is only used locally and is never uploaded or shared with anyone.",
        }
      },
      {
        element: ".tuto-example-data",
        popover: {
          title: "Example Data",
          description: "If needed you can find a sample dataset here if you don't have your own. Perfect for testing and experimenting!",
        }
      },
      {
        element: "#tuto-group-bttn",
        popover: {
          title: "How to connect your data?",
          description: "Most of the times you will want to connect your data by \"Group\", when your data is organized by categories. If there are a lot of categories you can use a CSV file listing the class of each file.",
        }
      },
      {
        element: ".group-data-field",
        popover: {
          title: "Connect Your Dataset",
          description: "Finally, this is where you can drag and drop your dataset for model training. Your data stays secure and never leaves your device.",
          align: "center",
          onNextClick: () => {
            trainingStore.setStep(3);
            scrollToTop();
            driverObj.moveNext();
          },
        }
      },
      {
        element: ".tuto-train-dash",
        popover:{
          title: "Training Mode",
          description: "This section allows you to choose how the model will be trained. Select between collaborative or local training modes.",
        }  
      },
      {
        element: "#train-collab-bttn",
        popover:{
          title: "Collaborative Training",
          description: "Train the model together with other users in a shared session.",
          align: "center",
          side: "top",
        }
      },
      {
        element: "#train-locally-bttn",
        popover:{
          title: "Experiment on your own",
          description: "To play around, you can train the model on your own device using only your data.",
          align: "center",
          side: "top",
          onNextClick: () => {
            trainingStore.setStep(4);
            driverObj.moveNext();
          },
        }
      },
      {
        popover: {
          title: "Save and ty out your model",
          description: "After training, you can save the model and evaluate it on test data.",
          align: "center"
        }
      },
      {
        element: "#tuto-evaluate-bttn",
        popover: {
          title: "The Model Library",
          description: "You can find all your trained models in the Model Library for future use.",
          align: "center",
        }
      },
      {
        element: "#tuto-slack-link",
        popover: {
          title: "The End!",
          description: "If you encounter any issue, feel free to ask questions or share your feedback on our Slack channel!",
          side: "top",
          align: "center",
          onNextClick: () => {
            trainingStore.setStep(1);
            router.push('/list');
            scrollToTop();
            driverObj.moveNext();
          },
        }
      },
    ];
    return steps
  }

  return { startFromSidebar, startOnFirstVisit };
},
  { persistedState: { persist: true } }
);


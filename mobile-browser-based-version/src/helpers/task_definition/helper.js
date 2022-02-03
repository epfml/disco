import axios from 'axios';
import * as config from './task.config.js';
import _ from 'lodash';

function createTaskClass(task) {
  let TaskClass =
    config.TASK_INFO[task.trainingInformation.dataType].frameClass;
  if (!TaskClass) {
    console.log(`Task ${task.taskID} was not processed`);
    return;
  }
  let newTaskFrame = new TaskClass(
    task.taskID,
    task.displayInformation,
    task.trainingInformation
  );
  return newTaskFrame;
}

function createTaskHelper(task) {
  let TaskHelper =
    config.TASK_INFO[task.trainingInformation.dataType].helperClass;
  if (!TaskHelper) {
    console.log(`Task ${task.taskID} Helper cannot be created`);
    return;
  }
  let taskHelper = new TaskHelper(task);
  return taskHelper;
}

async function loadTasks(convert = false) {
  const tasksURL = process.env.VUE_APP_DEAI_SERVER.concat('tasks');
  let response = await axios.get(tasksURL);
  const rawTasks = response.data;
  return convert ? _.map(rawTasks, createTaskClass) : rawTasks;
}

function onFileLoad(filesElement, callback, readAs = 'text') {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = async (e) => {
      // Preprocess the data and get object of the form {accepted: True/False, Xtrain: training data, ytrain: lavels}
      var res = await callback(e);
      resolve(res);
    };
    (readAs === 'text' ? reader.readAsText : reader.readAsDataURL)(
      filesElement
    );
  });
}

export { createTaskClass, createTaskHelper, loadTasks, onFileLoad };

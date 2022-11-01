# How to bring a new Deep Learning model on Disco : [DIS]tributed [CO]llaborative Learning

You must first bring your model to a TensorFlow JS format, consisting of a TensorFlow.js model file in a JSON format, and a weight file in .bin format.

We distinguish two use cases :

## I am a developper who wants to define my own task

In this case, your model and task will be uploaded and stored on our DISCO servers.

For more information on the task object instanciation itself, please refer to the TASK.md file in our documentation.

 - In ```disco/discojs/discojs-core/src/tasks/``` define your new custom task by instanciating a Task object, and define the async function ```model```. You will need to have your model in the .json + .bin format.
 - In ```disco/discojs/discojs-core/src/tasks/index.ts``` export your newly defined task
 - Run the ```./build.sh``` script from ```disco/discojs/discojs-core```
 - Reinstall cleanly the server by running ```npm ci``` from ```disco/server```
 - Reinstall cleanly the client by running ```npm ci``` from ```disco/web-client```
 - Instantiate a Disco server by running ```npm run dev``` from ```disco/server```
 - Instanciate a Disco client by running ```npm run dev``` from ```disco/web-client```
 Your task has been successfully uploaded.
 
## I am a user who wants to define my custom task and upload my model to Disco
 - Through the user interface, click on the *create* button on "Add your own model to be trained in a DISCOllaborative"
 - Fill in all the relevant information for your task and model
 - Upload the .json + .bin model in the *Model Files* box.
 Your task has been successfully uploaded.

### I have a Pytorch Model that I want to upload on Disco
As is, you cannot upload directly your Pytorch model to Disco, you first need to convert it to a TensorFlowJS format.
You will need to convert your Pytorch model into a TensorFlowJS model using one of the two methods below : 
  - Rewrite your model using the tensorflowJS's [Layer API](https://www.tensorflow.org/js/guide/models_and_layers), and then [save your model](https://www.tensorflow.org/js/guide/save_load) and recover the JSON and .bin files required.
  - First, convert your model into a Keras format using [pytorch2keras](https://pypi.org/project/pytorch2keras/0.1.6/). Then convert the keras model to TensorFlowJS using the following command ```
tensorflowjs_converter --input_format keras <path-to-keras-model> <name-of-the-folder-to-save-js-model>
```


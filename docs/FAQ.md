# Disco - FAQ

### Problem: Using TensorFlow.js on Mac laptops with M1 chips

### Solution:

`TensorFlow.js` in version `3` currently supports M1 Mac laptops. However, make sure you have an `arm` Node.js executable installed (not `x86`). It can be checked using:

```
node -p "process.arch"
```

which should output something similar to `arm64`. Then, `npm i @tensorflow/tfjs` and `npm i @tensorflow/tfjs-node` will install TF.js for ARM.

### Problem: `npm run dev` version error on Windows 11 with correct npm and Node versions

### Solution:

1. Remove npm and Node completely from your computer.
2. Install the latest version of npm and Node, then execute `npm run dev` again.
3. If you receive an error, then run the following commands by using nvm.

   ```
   nvm use
   ```

   If you do not have nvm installed, it can be downloaded from [here](https://github.com/coreybutler/nvm-windows).

4. Execute `npm run dev` and you are done!

### Problem: Importing models or weights from Pytorch to TensorflowJS

### Solution:


There exist several libraries that try to perform automatic conversion between frameworks, which we do not recommend as most of the tools have compatibility issues if the model contains components which differ strongly in implementation between the two frameworks.
The simplest way to obtain a TensorflowJS model is to first obtain a Tensorflow/Keras model, stored as a .h5 file, and then convert it using TensorflowJS's converter tool, which transforms a Tensorflow/Keras model to TensorflowJS. To obtain the Keras/Tensorflow model from we strongly recommend to directly develop the model in Keras : most of Pytorch components have their equivalent counterpart in Tensorflow/Keras, and translating model architectures between these two frameworks can be done in a straightforward way. One caveat is that, weights currently cannot be converted from the Pytorch `.pth` format to the Keras `.h5` format, so the model must be retrained.

Given your keras model file, to convert it to a TensorFlowJS model:
```bash
$ tensorflowjs_converter --input_format=keras my_model_name.h5 /tfjs_model
```

Side Note : If you already have a TensorFlow saved model, the conversion to TensorFlowJS is straightforward with the following command :
```bash
$ tensorflowjs_converter --input_format=tf_saved_model my_tensorflow_saved_model /tmp/tfjs_model
```

Make sure to convert to TF.js [LayersModel](https://www.tensorflow.org/js/guide/models_and_layers) (not GraphModel, as the latter are inference only, so can not be trained).

Following the `tensorflowjs_converter` command, you will recover two files : a .json describing your model architecture, and a collection of .bin files describing your model weights, which are ready to be uploaded on DisCo. In order to do so, refer to our documentation [here](/TASK.md)
Note that the following conversion is only possible in cases of models for which TensorFlowJS possesses the [corresponding modules](https://js.tensorflow.org/api/latest/).





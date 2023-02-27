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

### Problem: Importing models or weights from different frameworks like Pytorch to TensorflowJS

### Solution:

The pipeline for any conversion scheme that takes a model in a framework X (imagine Pytorch as a guiding example) goes usually as follows :

Framework X -> ONNX -> Keras -> TensorflowJS

Any conversion tool that takes a model written in a framework X (take Pytorch as an example) will likely rely on an intermediate conversion to ONNX. Depending on your framework, there exists several libraries that perform the first conversion of the pipeline. For Pytorch, such a conversion can be found [here](https://pytorch.org/docs/stable/onnx.html).

The major issue comes from the second conversion in the pipeline. There currently exists only one external library [here](https://github.com/gmalivenko/onnx2keras) that performs said conversion, however this library is not maintained anymore and has many compatibility issues. For simple Sequential models, the conversion works correctly. However, when adding batch_normalization layers, custom modules which require Attention mechanisms, or components which exist in Pytorch but not directly in Keras, the conversion will fail. Unless the model is very simple, we strongly recommend to directly develop the model in Keras : most of Pytorch components have their equivalent counterpart in Tensorflow/Keras. One caveat is that, weights currently cannot be converted from the Pytorch `.pth` format to the Keras `.h5` format.

Then, given your keras model file, to convert it to a TensorFlowJS model:
```bash
$ tensorflowjs_converter --input_format=keras my_model_name.h5 /tfjs_model
```

Side Note : If you already have a TensorFlow saved model, the conversion to TensorFlowJS is straightforward with the following command :
```bash
$ tensorflowjs_converter --input_format=tf_saved_model my_tensorflow_saved_model /tmp/tfjs_model
```

Make sure to convert to TF.js [LayersModel](https://www.tensorflow.org/js/guide/models_and_layers) (not GraphModel, as the latter are inferene only, so can not be trained).

Following the `tensorflowjs_converter` command, you will recover two files : a .json describing your model architecture, and a collection of .bin files describing your model weights, which are ready to be uploaded on DisCo. In order to do so, refer to our documentation [here](/TASK.md)
Note that the following conversion is only possible in cases of models for which TensorFlowJS possesses the [corresponding modules](https://js.tensorflow.org/api/latest/).



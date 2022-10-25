from os.path import realpath
from pathlib import Path

import tensorflowjs as tfjs
import tensorflow as tf
from keras.applications.vgg16 import VGG16


"""
    Before the running this script, make sure the required pip packages are installed:
    pip install -r requirements.txt

    This script loads the VGG16 backbone model from Tensorflow and saves it under a Tensorflow.js
    format. The model's files are saved under the ./tfjs-backbone-model directory.
"""


IMG_SIZE = 64
MODEL_PATH = Path(realpath(__file__)).parent.joinpath('tfjs-backbone-model')


def get_VGG16(img_size: int) -> tf.keras.Sequential:
    return VGG16(
        input_shape=(img_size, img_size, 3),
        include_top=False,
        weights='imagenet'
    )


if __name__ == '__main__':
    model = get_VGG16(IMG_SIZE)
    tfjs.converters.save_keras_model(model, str(MODEL_PATH))


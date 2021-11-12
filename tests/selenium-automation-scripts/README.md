# README

This folder is dedicated to aritficial simulation of the distributed training process using the DeAI (decentralized learning) or FeAI (federated learning) platform, with many simulated users present. Our script uses the selenium library for python as it is the most popular and easy to use. In this folder we provide the following files:


# Files

*util.py* - This file contains useful functions that are reused in most of the other files

*selenium_script_lungs.py* - This file is used to simulate the distributed training of the covid lungs task, at the top of the file you can find all the necessary constans to personalise the platfrom, number of peers, data split, training type and the ammount of images, as well as the paths as the paths that need to point to your data.

*selenium_script_CIFAR10.py* - This file is used to simulate the distributed training of the CIFAR10 task, at the top of the file you can find all the necessary constans to personalise the platfrom, number of peers, data split, training type and the ammount of images, as well as the paths as the paths that need to point to your data.

*selenium_script_MNIST.py* - This file is used to simulate the distributed training of the MNIST task, at the top of the file you can find all the necessary constans to personalise the platfrom, number of peers, data split, training type and the ammount of images, as well as the paths as the paths that need to point to your data.

*selenium_script_Titanic.py* - This file is used to simulate the distributed training of the Titanic task, at the top of the file you can find all the necessary constans to personalise the platfrom, number of peers, data split, training type and the ammount of images, as well as the paths that need to point to your data.

# DataSets

*MNIST* - a sample dataset is provided in the folder *preprocessed_images*, you can dowload the full dataset here: http://yann.lecun.com/exdb/mnist/

*CIFAR10* - a sample dataset is provided in the folder *preprocessed_images* and the lables of the images are provided in the *labels.csv* file, you can dowload the full dataset here: https://www.kaggle.com/c/cifar-10/data

*COVID_lungs* - a sample dataset is provided in the folder *preprocessed_images* (*covid-negative* and *covid-postive* folders).

*Titanic* - The full dataset is provided in the *train.csv* file.

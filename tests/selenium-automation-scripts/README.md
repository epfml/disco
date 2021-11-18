
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

# Results

*Remark: CPU usage is calculated of a core, that means it can be >100% if the model uses multiple cores.*

*MNIST*:

 - With 50 images per digit, 'iid' data split running on 2 nodes achieved 97.39% training accuracy in 112.67 seconds with 0.1 epochs/seconds, average CPU usage was 52.82%, average RAM usage was 0.38% 
 -  With 60 images per digit, *[0.5, 0.25, 0.25]* data split between 3 nodes achieved 73.89% training accuracy in 52.21 seconds with 0.79 epochs/seconds, average CPU usage was 41.77%, average RAM usage was 0.46% 
 -  With 60 images per digit, *[0.5, 0.2, 0.1, 0.1, 0.1]* data split between 5 nodes achieved 69.0% training accuracy in 131.22 seconds with 0.14 epochs/seconds, average CPU usage was 53.99%, average RAM usage was 0.66% 
 - With 500 images per digit, 'iid' data split running on 2 nodes achieved 99.88% training accuracy in 190.64 seconds with 0.059 epochs/seconds, average CPU usage was 51.07%, average RAM usage was 0.43% 
 -  With 500 images per digit, *[0.5, 0.25, 0.25]* data split between 3 nodes achieved 96.07% training accuracy in 99.36 seconds with 0.014 epochs/seconds, average CPU usage was 50.87%, average RAM usage was 0.51% 
 -  With 1000 images per digit, *[0.5, 0.2, 0.1, 0.1, 0.1]* data split between 5 nodes achieved 96.93% training accuracy in 176.6 seconds with 0.08 epochs/seconds, average CPU usage was 53.65%, average RAM usage was 0.74%, Max CPU usage was 375.75%

*CIFAR10*:

 - With 1000 images, 'iid' data split running on 2 nodes achieved 37.37% training accuracy in 270 seconds with 0.03 epochs/seconds, average CPU usage was 19.82% and Average RAM usage was 0.4%
 - With 1000 images,  *[0.5, 0.25, 0.25]* data split between 3 nodes achieved 22.0% training accuracy in 154 seconds with 0.06 epochs/seconds, average CPU usage was 36.3%, average RAM usage was 0.5% 
 - With 1000 images,  *[0.5, 0.2, 0.1, 0.1, 0.1]* data split between 5 nodes achieved 17.25% training accuracy in 153.99 seconds with 0.08 epochs/seconds, average CPU usage was 42.89%, average RAM usage was 0.66% 
 - With 4000 images, 'iid' data split running on 2 nodes achieved 47.44% training accuracy in 1033 seconds with 0.01 epochs/seconds, average CPU usage was 6.95% and Average RAM usage was 0.45%
 - With 5000 images,  *[0.5, 0.25, 0.25]* data split between 3 nodes achieved 33.38% training accuracy in 530 seconds with 0.016 epochs/seconds, average CPU usage was 17.06%, average RAM usage was 0.52%, Max CPU usage was 151.8% 
 - With 10000 images,  *[0.5, 0.25, 0.25]* data split between 3 nodes achieved 38.18% training accuracy in 1030 seconds with 0.007 epochs/seconds, average CPU usage was 9.77%, average RAM usage was 0.57%, Max CPU usage was 83.1%




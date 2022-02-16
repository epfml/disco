
# README

This folder is dedicated to aritficial simulation of the distributed training process using the DeAI (decentralized learning) or FeAI (federated learning) platform, with many simulated users present. Our script uses the selenium library for python as it is the most popular and easy to use

We first created a simulation script that was able to open a select number of chrome drivers, upload the data and start training. In this version, the script user was only able to easily choose the following parameters: Number of peers, number of images to be uploaded (for image tasks) and the training mode between distributed and local. Although this was a useful tool it was very limited due to the data being always uniform between peers. To improve the situation, extra functions were added to partition data in various different ways between nodes. The three partition functions implemented were:

*Regular even size partition* - This would be useful to model the assumption the different nodes have completely different data points and additionally have the assumption that different nodes have even amounts of data points

*Random sized partitions* - This would be useful to model scenarios that would reflect reality where nodes would have very different data point amounts and to see how the platform deals with these situations

*Predefined size partitions* - This partition function is undoubtedly the most useful one to determine how the platform behaves under various predefined circumstances. For example, what is the difference between nodes splitting the data evenly and having the data split with ratios of 0.6 and 0.4.

At the end of these updates, the user now had the options to easily pick between these parameters for simulation: 


*Number of peers* - This allowed the users to choose the number of browser instances to run.

*Training Mode* - This allowed users to choose Between Federated learning and Decentralised.

*Data Split* - This allowed users to choose between the partitions explained above.

*Ratios* - This allowed a user to choose the ratios of the total data that each node will have in the simulation

*Number of Data Points* - This allowed users to choose how many total data points to use for the platform simulation

# Usage

Each script uses many of the same functions, they are coded and doccummented in the *util.py* file. If the UI changes and the scripts don't work as accepted the easiest way to fix these is by locating new elements using the selenium [documentation](https://selenium-python.readthedocs.io/locating-elements.html) and then simply updating the ids/xpaths of the changed elements. 

To use the script, the user should simple open one of the .py files set the CONSTANTS descriped above and run the code like this: 
```
python name_of_simulation_script.py
```

# DataSets

*MNIST* - a sample dataset is provided in the folder *preprocessed_images*, you can dowload the full dataset here: http://yann.lecun.com/exdb/mnist/

*CIFAR10* - a sample dataset is provided in the folder *preprocessed_images* and the lables of the images are provided in the *labels.csv* file, you can dowload the full dataset here: https://www.kaggle.com/c/cifar-10/data

*COVID_lungs* - a sample dataset is provided in the folder *preprocessed_images* (*covid-negative* and *covid-postive* folders).

*Titanic* - The full dataset is provided in the *train.csv* file.

# Results

After using this tool to simulate the platform on a benchmark dataset like CIFAR10, these are the results ran on even sized partitions:
*MNIST*:
![alt text](1000-images.png)
![alt text](2000-images.png)

Having attained these results we can clearly see that the model is performing well on the training accuracy and taking into account that it is only running on 1000 / 2000 images its validation accuracy is approaching the state of the art models discussed previously.





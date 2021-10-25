""" Runs the CIFAR10 task on DeAI or FeAI.

Constants: 
Use 'PLATFORM' to choose the platform (FeAI or DeAI)
Use `IMAGE_FILE_PATH` to point to the data folder. 
Use `LABEL_FILE_PATH` to point to the csv file. 
Use `NUM_IMAGES` to limit the number of images per peer to test faster.
Use `NUM_PEERS` to define the number of peers to run.
Use `TRAINING_TYPE` to choose between training alone or distributed.

How to run:
python selenium_script_CIFAR10.py  .py
"""

import random
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
import time
from selenium.webdriver.common.action_chains import ActionChains
import os
import math
import csv
from webdriver_manager.chrome import ChromeDriverManager

#Platform
PLATFORM = 'https://epfml.github.io/DeAI/#' #"https://epfml.github.io/DeAI/#/" for Decentralized learning
# Defines how many browser tabs to open
NUM_PEERS  = 3
# Defines the way to split the data, could be 'iid', 'partition' for even size partitions, 'rparition' for random size partitions
DATA_SPLIT = 'spartition'
# Should match the name of the task in the task list and is case sensitive
TASK_NAME = 'CIFAR10'
# can be either 'Train Alone' or 'Train Distributed'. Should match the text of the button in the train screen.
TRAINING_TYPE = 'Train Distributed' 
# paths to the file containing the CSV file of Titanic passengers with 12 columns
IMAGE_FILE_PATH = r'preprocessed_images/CIFAR10'
LABEL_FILE_PATH = 'labels.csv'

# Download and extract chromedriver from here: https://sites.google.com/a/chromium.org/chromedriver/downloads
# Not neccesary after ChromeDriverManager was imported
op = webdriver.ChromeOptions()
op.add_argument('headless') 
# You can add options=op for chrome headless mode
# drivers = [webdriver.Chrome(ChromeDriverManager().install(), options=op) for i in range(NUM_PEERS)]
drivers = [webdriver.Chrome(ChromeDriverManager().install()) for i in range(NUM_PEERS)]

def get_files(directory, num_images):
    files = []
    for dirpath,_,filenames in os.walk(directory):
        for f in filenames:
            if '.png' in f:
                files.append(os.path.abspath(os.path.join(dirpath, f)))
    return files[:num_images]

def read_csv(file_path):
    with open(file_path, newline='') as f:
        reader = csv.reader(f)
        results = dict(reader) 
    return results

def create_csv(dic, name):
    with open(name, 'w') as f:
        for key in dic.keys():
            f.write(f"{key},{dic[key]}\n")

def partition(list_in, n):
    x = list(enumerate(list_in))
    random.shuffle(x)
    indices, ls = zip(*x)
    labels = read_csv(LABEL_FILE_PATH)

    for i in range(n):
        temp_dic = {str(k): labels[str(k)] for k in indices[i::n]}
        create_csv(temp_dic, str(i) + '_partition.csv')
    return [(ls[i::n]) for i in range(n)]

def r_parirtion(list_in, n):
    x = list(enumerate(list_in))
    random.shuffle(x)
    indices, ls = zip(*x)
    labels = read_csv(LABEL_FILE_PATH)
    partition_indices = []
    indices_out = [] 
    list_out = []
    for _ in range(n - 1):
        rand_index = random.randint(1, len(list_in) - 1)
        while rand_index in partition_indices:
            rand_index = random.randint(1, len(list_in) - 1)
        partition_indices.append(rand_index)
    partition_indices = sorted(partition_indices)

    for i in range(len(partition_indices)):
        if i == 0:
            list_out.append(ls[0:partition_indices[i]])
            indices_out.append(indices[0:partition_indices[i]])
        else:
            list_out.append(ls[partition_indices[i - 1]:partition_indices[i]])
            indices_out.append(indices[partition_indices[i - 1]:partition_indices[i]])

    list_out.append(ls[partition_indices[len(partition_indices) - 1]:])
    indices_out.append(indices[partition_indices[len(partition_indices) - 1]:])

    for i in range(n):
        temp_dic = {str(k): labels[str(k)] for k in indices_out[i]}
        create_csv(temp_dic, str(i) + '_partition.csv')

    return list_out

def s_parirtion(list_in, ratios):
    x = list(enumerate(list_in))
    random.shuffle(x)
    indices, ls = zip(*x)
    labels = read_csv(LABEL_FILE_PATH)
    partition_indices = []
    indices_out = [] 
    list_out = []
    for i in range(len(ratios)):
        curr_slice_index = math.ceil(ratios[i] * len(ls))
        if i == 0:
            partition_indices.append(int(curr_slice_index))
        else:
            partition_indices.append(int(partition_indices[i - 1] + curr_slice_index))
    for i in range(len(partition_indices)):
        if i == 0:
            list_out.append(ls[0:partition_indices[i]])
            indices_out.append(indices[0:partition_indices[i]])
        else:
            list_out.append(ls[partition_indices[i - 1]:partition_indices[i]])
            indices_out.append(indices[partition_indices[i - 1]:partition_indices[i]])
    for i in range(len(indices_out)):
        temp_dic = {str(k): labels[str(k)] for k in indices_out[i]}
        create_csv(temp_dic, str(i) + '_partition.csv')
    return list_out
 
partitions = s_parirtion(get_files(IMAGE_FILE_PATH, 7), [4/7, 2/7, 1/7])
#partitions = r_parirtion(get_files(IMAGE_FILE_PATH, 7), NUM_PEERS)
#partitions = parirtion(get_files(IMAGE_FILE_PATH, 7), NUM_PEERS)

for index, driver in enumerate(drivers):
    # Click 'Start Building' on home page
    driver.get(PLATFORM)
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if 'Start building' in elem.get_attribute('innerHTML'):
            elem.click()

    # Find CIFAR10 task and click 'Join' on task list page
    time.sleep(0.5)
    elements = driver.find_elements_by_css_selector('div.group')
    for element in elements:
        if TASK_NAME in element.get_attribute('innerHTML'):
            button = element.find_element_by_tag_name('button')
    button.click()

    # Click 'Join Training' on Task Description page
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if 'Join Training' in elem.get_attribute('innerHTML'):
            elem.click()

    # Upload files on Task Training
    time.sleep(4)
    driver.find_element_by_id('hidden-input_cifar10-model_Images').send_keys(' \n '.join(partitions[index]))
    driver.find_element_by_id('hidden-input_cifar10-model_Labels').send_keys(os.path.abspath(str(index) + '_partition.csv'))

# Start training on each driver
for driver in drivers:
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if TRAINING_TYPE in elem.get_attribute('innerHTML'):
            driver.execute_script("arguments[0].scrollIntoView();", elem)
            elem.click()
            break


#Print out the Accuracy after training
continue_searcing = True

while continue_searcing:
    if len(drivers[0].find_elements_by_xpath("//*[@class='c-toast c-toast--success c-toast--bottom-right']")) > 0:
        for f in drivers[0].find_elements_by_xpath("//*[@class='c-toast c-toast--success c-toast--bottom-right']"):
            # print("Im here")
            if 'has finished training' in f.text:
                print(f"Train accuracy = {drivers[0].find_element_by_id('val_trainingAccuracy_cifar10-model').text}")
                print(f"Validation accuracy = {drivers[0].find_element_by_id('val_validationAccuracy_cifar10-model').text}")
                continue_searcing = False
                break

for driver in drivers:
    driver.quit()


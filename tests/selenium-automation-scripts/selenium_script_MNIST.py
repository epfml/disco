""" Runs the MNIST task on DeAI or FeAI.

Constants: 
Use 'DIGIT_CLASS_PATHS' to point to the 9 data folders for each digit. 
Use `NUM_IMAGES` to limit the number of images per peer to test faster.
Use `NUM_PEERS` to define the number of peers to run.
Use `TRAINING_TYPE` to choose between training alone or distributed.

How to run:
python selenium_script_MNIST.py
"""

from selenium import webdriver
from selenium.webdriver.common.keys import Keys
import time
import random
import math
from selenium.webdriver.common.action_chains import ActionChains
import os
from webdriver_manager.chrome import ChromeDriverManager

#Platform
PLATFORM = 'https://epfml.github.io/DeAI/#' #"https://epfml.github.io/DeAI/#/" for Decentralized learning
# Defines how many browser tabs to open
NUM_PEERS = 2
# Defines the way to split the data, could be 'iid', 'partition' for even size partitions, 'rparition' for random size partitions,  s_partition for specific size partitions
DATA_SPLIT = 'spartition'
# Should match the name of the task in the task list and is case sensitive
TASK_NAME = 'MNIST'
# can be either 'Train Alone' or 'Train Distributed'. Should match the text of the button in the train screen.
TRAINING_TYPE = 'Train Distributed' 
#Number of images to train with
NUM_IMAGES = 15
# Digit folder paths, change to \ for macOS
DIGIT_CLASS_PATHS = [
    r'preprocessed_images/0',
    r'preprocessed_images/1',
    r'preprocessed_images/2',
    r'preprocessed_images/3',
    r'preprocessed_images/4',
    r'preprocessed_images/5',
    r'preprocessed_images/6',
    r'preprocessed_images/7',
    r'preprocessed_images/8',
    r'preprocessed_images/9'
]

start_time = time.time()

def get_files(directory, num_images):
    files = []
    for dirpath,_,filenames in os.walk(directory):
        for f in filenames:
            if '.jpg' in f:
                files.append(os.path.abspath(os.path.join(dirpath, f)))
    return files[:num_images]

def partition(list_in, n):
    random.shuffle(list_in)
    return [list_in[i::n] for i in range(n)]

def r_partition(list_in, n):
    random.shuffle(list_in)
    partition_indices = []
    list_out = []
    for _ in range(n - 1):
        rand_index = random.randint(1, len(list_in) - 1)
        while rand_index in partition_indices:
            rand_index = random.randint(1, len(list_in) - 1)
        partition_indices.append(rand_index)
    partition_indices = sorted(partition_indices)
    for i in range(len(partition_indices)):
        if i == 0:
            list_out.append(list_in[0:partition_indices[i]])
        else:
            list_out.append(list_in[partition_indices[i - 1]:partition_indices[i]])
    list_out.append(list_in[partition_indices[len(partition_indices) - 1]:])
    return list_out

def s_partition(list_in, ratios):
    random.shuffle(list_in)
    list_in = sorted(list_in)
    partition_indices = []
    list_out = []
    for i in range(len(ratios)):
        curr_slice_index = math.ceil(ratios[i] * len(list_in))
        if i == 0:
            partition_indices.append(int(curr_slice_index))
        else:
            partition_indices.append(int(partition_indices[i - 1] + curr_slice_index))
    for i in range(len(partition_indices)):
        if i == 0:
            list_out.append(list_in[0:partition_indices[i]])
        else:
            list_out.append(list_in[partition_indices[i - 1]:partition_indices[i]])
    return list_out

# Download and extract chromedriver from here: https://sites.google.com/a/chromium.org/chromedriver/downloads
# Not neccesary after ChromeDriverManager
op = webdriver.ChromeOptions()
op.add_argument('headless') 
drivers = [webdriver.Chrome(ChromeDriverManager().install()) for i in range(NUM_PEERS)]

digit_files = [get_files(DIGIT_CLASS_PATHS[i], NUM_IMAGES) for i in range(len(DIGIT_CLASS_PATHS))]

if DATA_SPLIT == 'partition':
    digit_partitions = [partition(digit_files[i], NUM_PEERS) for i in range(len(digit_files))]
elif DATA_SPLIT == 'rpartition':
    digit_r_partitions = [r_partition(digit_files[i], NUM_PEERS) for i in range(len(digit_files))]
elif DATA_SPLIT == 'spartition':
    digit_s_partitions = [s_partition(digit_files[i], [0.66, 0.33]) for i in range(len(digit_files))]

for index, driver in enumerate(drivers):
    # Click 'Start Building' on home page
    driver.get(PLATFORM)
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if 'Start building' in elem.get_attribute('innerHTML'):
            elem.click()

    # Find MNIST task and click 'Join' on task list page
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
    time.sleep(8)
    if DATA_SPLIT == 'iid':
        for i in range(len(DIGIT_CLASS_PATHS)):
            driver.find_element_by_id('hidden-input_mnist-model_' + str(i)).send_keys(' \n '.join(get_files(DIGIT_CLASS_PATHS[i], NUM_IMAGES)))
    elif DATA_SPLIT == 'partition':
         for i in range(len(DIGIT_CLASS_PATHS)):
            driver.find_element_by_id('hidden-input_mnist-model_' + str(i)).send_keys(' \n '.join(digit_partitions[i][index]))
    elif DATA_SPLIT == 'rpartition':
         for i in range(len(DIGIT_CLASS_PATHS)):
            driver.find_element_by_id('hidden-input_mnist-model_' + str(i)).send_keys(' \n '.join(digit_r_partitions[i][index]))
    elif DATA_SPLIT == 'spartition':
         for i in range(len(DIGIT_CLASS_PATHS)):
            driver.find_element_by_id('hidden-input_mnist-model_' + str(i)).send_keys(' \n '.join(digit_s_partitions[i][index]))

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
            if 'has finished training' in f.text:
                print(f"Train accuracy = {drivers[0].find_element_by_id('val_trainingAccuracy_mnist-model').text}")
                print(f"Validation accuracy = {drivers[0].find_element_by_id('val_validationAccuracy_mnist-model').text}")
                print("Training took: %s seconds" % (time.time() - start_time))
                continue_searcing = False
                break

for driver in drivers:
    driver.quit()


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

from selenium import webdriver
import time
import os
from webdriver_manager.chrome import ChromeDriverManager

from util import find_task_page, generate_report, get_files, img_partition, img_r_partition, img_s_partition, start_training


#Platform
PLATFORM = 'https://epfml.github.io/DeAI/#' #"https://epfml.github.io/DeAI/#/" for Decentralized learning
# Defines how many browser tabs to open
NUM_PEERS  = 3
# Defines the way to split the data, could be 'partition' for even size partitions, 'rpartition' for random size partitions
# 'spartition' for parition of size passed as an argument RATIOS.
DATA_SPLIT = 'spartition'
RATIOS = [0.5, 0.3, 0.2]
# Should match the name of the task in the task list and is case sensitive
TASK_NAME = 'CIFAR10'
# can be either 'Train Alone' or 'Train Distributed'. Should match the text of the button in the train screen.
TRAINING_TYPE = 'Train Distributed' 
# paths to the file containing the CSV file of Titanic passengers with 12 columns
IMAGE_FILE_PATH = r'preprocessed_images/CIFAR10'
LABEL_FILE_PATH = 'labels.csv'
NUM_IMAGES = 300


# Download and extract chromedriver from here: https://sites.google.com/a/chromium.org/chromedriver/downloads
# Not neccesary after ChromeDriverManager was imported
op = webdriver.ChromeOptions()
op.add_argument('headless') 
# You can add options=op for chrome headless mode
# drivers = [webdriver.Chrome(ChromeDriverManager().install(), options=op) for i in range(NUM_PEERS)]
drivers = [webdriver.Chrome(ChromeDriverManager().install()) for i in range(NUM_PEERS)]
start_time = time.time()
 
if DATA_SPLIT == 'partition':
    partitions = img_partition(get_files(IMAGE_FILE_PATH, NUM_IMAGES, '.png'), NUM_PEERS)
elif DATA_SPLIT == 'spartition':
    partitions = img_s_partition(get_files(IMAGE_FILE_PATH, NUM_IMAGES, '.png'), RATIOS)  
elif DATA_SPLIT == 'rpartition':
    partitions = img_r_partition(get_files(IMAGE_FILE_PATH, NUM_IMAGES, '.png'), NUM_PEERS)

for index, driver in enumerate(drivers):
    find_task_page(driver, PLATFORM, TASK_NAME)

    # Upload files on Task Training
    time.sleep(6)
    if DATA_SPLIT != 'iid':
        driver.find_element_by_id('hidden-input_cifar10-model_Images').send_keys(' \n '.join(partitions[index]))
        driver.find_element_by_id('hidden-input_cifar10-model_Labels').send_keys(os.path.abspath(LABEL_FILE_PATH))
    else:
        driver.find_element_by_id('hidden-input_cifar10-model_Images').send_keys(' \n '.join(get_files(IMAGE_FILE_PATH, NUM_IMAGES, '.png')))
        driver.find_element_by_id('hidden-input_cifar10-model_Labels').send_keys(os.path.abspath(LABEL_FILE_PATH))

# Start training on each driver
train_start_time = time.time()
start_training(drivers, TRAINING_TYPE)

generate_report('report.txt', \
    drivers, \
    start_time, \
    train_start_time, \
    'val_trainingAccuracy_cifar10-model', \
    'val_validationAccuracy_cifar10-model', \
    2)

for driver in drivers:
    driver.quit()

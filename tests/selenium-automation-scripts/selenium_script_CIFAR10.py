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

from util import find_task_page, generate_report, get_files, img_partition, img_r_partition, img_s_partition, pick_training_mode, start_training


#Platform
PLATFORM = 'https://epfml.github.io/DeAI/#/'
TRAINING_MODE = 'Decentralised'
# Defines how many browser tabs to open
NUM_PEERS = 2
# Defines the way to split the data, could be 'partition' for even size partitions, 'rpartition' for random size partitions
# 'spartition' for parition of size passed as an argument RATIOS.
DATA_SPLIT = 'spartition'
RATIOS = [0.6, 0.4]
#You can set time offsets for nodes to join at variable times
TIME_OFFSETS = [0, 0, 0]
# Should match the name of the task in the task list and is case sensitive
TASK_NAME = 'CIFAR10'
# can be either 'decentralised' or 'federated'. Should match the text of the button in the train screen.
TRAINING_TYPE = 'decentralised' 
# paths to the file containing the CSV file of Titanic passengers with 12 columns
IMAGE_FILE_PATH = r'train (1)/train'
LABEL_FILE_PATH = 'labels.csv'
NUM_IMAGES = 10


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


    find_task_page(driver, PLATFORM, TASK_NAME, TRAINING_MODE)
    # Upload files on Task Training
    time.sleep(6)
    if DATA_SPLIT != 'iid':
        driver.find_element_by_id('hidden-input_cifar10_Images').send_keys(' \n '.join(partitions[index]))
        driver.find_element_by_id('hidden-input_cifar10_Labels').send_keys(os.path.abspath(LABEL_FILE_PATH))
    else:
        driver.find_element_by_id('hidden-input_cifar10_Images').send_keys(' \n '.join(get_files(IMAGE_FILE_PATH, NUM_IMAGES, '.png')))
        driver.find_element_by_id('hidden-input_cifar10_Labels').send_keys(os.path.abspath(LABEL_FILE_PATH))

# Start training on each driver
time.sleep(5)
train_start_time = time.time()
time.sleep(8)
start_training(drivers, TRAINING_TYPE, TIME_OFFSETS)
time.sleep(5)

generate_report('report.txt', \
    drivers, \
    start_time, \
    train_start_time, \
    '//*[@id="app"]/div/div/div/div/div/div/div/main/div/div/div[3]/div[1]/div/div[2]/p/span[1]', \
    '//*[@id="app"]/div/div/div/div/div/div/div/main/div/div/div[3]/div[1]/div/div[1]/p/span[1]', \
    2)

for driver in drivers:
    driver.quit()

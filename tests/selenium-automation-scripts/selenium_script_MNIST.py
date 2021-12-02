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
from selenium.webdriver.common.action_chains import ActionChains
from webdriver_manager.chrome import ChromeDriverManager

from util import find_task_page, generate_report, get_files, img_partition, img_r_partition, img_s_partition, start_training

#Platform
PLATFORM = 'https://epfml.github.io/FeAI/#/'
TRAINING_MODE = 'Federated'
# Defines how many browser tabs to open
NUM_PEERS = 2
# Defines the way to split the data, could be 'iid' for iid data, 'partition' for even size partitions, 'rpartition' for random size partitions
# 'spartition' for partition of sizes past as argument RATIOS
DATA_SPLIT = 'iid'
RATIOS = [0.5, 0.2, 0.1, 0.1, 0.1]
# Should match the name of the task in the task list and is case sensitive
TASK_NAME = 'MNIST'
# can be either 'Train Alone' or 'Train Distributed'. Should match the text of the button in the train screen.
TRAINING_TYPE = 'Train Distributed' 
#Number of images to train with
NUM_IMAGES = 20
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

# Download and extract chromedriver from here: https://sites.google.com/a/chromium.org/chromedriver/downloads
# Not neccesary after ChromeDriverManager
op = webdriver.ChromeOptions()
op.add_argument('headless') 
drivers = [webdriver.Chrome(ChromeDriverManager().install()) for i in range(NUM_PEERS)]

digit_files = [get_files(DIGIT_CLASS_PATHS[i], NUM_IMAGES, '.jpg') for i in range(len(DIGIT_CLASS_PATHS))]

if DATA_SPLIT == 'partition':
    digit_partitions = [img_partition(digit_files[i], NUM_PEERS) for i in range(len(digit_files))]
elif DATA_SPLIT == 'rpartition':
    digit_partitions = [img_r_partition(digit_files[i], NUM_PEERS) for i in range(len(digit_files))]
elif DATA_SPLIT == 'spartition':
    digit_partitions = [img_s_partition(digit_files[i], RATIOS) for i in range(len(digit_files))]

for index, driver in enumerate(drivers):
    find_task_page(driver, PLATFORM, TASK_NAME, TRAINING_MODE)
    time.sleep(8)
    if DATA_SPLIT == 'iid':
        for i in range(len(DIGIT_CLASS_PATHS)):
            driver.find_element_by_id('hidden-input_mnist-model_' + str(i)).send_keys(' \n '.join(digit_files[i]))
    else:
         for i in range(len(DIGIT_CLASS_PATHS)):
            driver.find_element_by_id('hidden-input_mnist-model_' + str(i)).send_keys(' \n '.join(digit_partitions[i][index]))

# Start training on each driver
train_start_time = time.time()
time.sleep(8)
start_training(drivers, TRAINING_TYPE)
time.sleep(5)

generate_report('report.txt', \
    drivers, \
    start_time, \
    train_start_time, \
    'val_trainingAccuracy_mnist-model', \
    'val_validationAccuracy_mnist-model', \
    10)


for driver in drivers:
    driver.quit()


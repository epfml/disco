""" Runs the COVID Lung Ultrasound task on DeAI.

Prerequisites:
Download a chromedriver from here: https://sites.google.com/a/chromium.org/chromedriver/downloads.
Extract the chromedriver in the current folder.
Prepare the covid positive and covid negative images in separate folders. 

Constants: 
Use `POSITIVE_CLASS_PATH` and `NEGATIVE_CLASS_PATH` to point to the two data folders. 
Use `NUM_IMAGES` to limit the number of images per peer to test faster.
Use `NUM_PEERS` to define the number of peers to run.
Use `TRAINING_TYPE` to choose between training alone or distributed.
Use 'DATA_SPLIT' to choose between iid data, randomly partitioned data wiht even size partitions, randomly partitioned data with random size partition

How to run:
python run_lus_covid.py
"""

from selenium import webdriver
from selenium.webdriver.common.keys import Keys
import time
import platform
from webdriver_manager.chrome import ChromeDriverManager

from util import calculate_epoch_per_second, find_task_page, get_files, img_partition, img_r_partition, img_s_partition, print_train_acc, start_training

# Platform
PLATFORM = 'https://epfml.github.io/DeAI/#' #"https://epfml.github.io/DeAI/#/" for Decentralized learning
# Defines how many browser tabs to open
NUM_PEERS  = 5
# Defines the way to split the data,could be 'iid' for iid data, 'partition' for even size partitions, 'rparition' for random size partitions
# 'spartition' for partition of sizes past as argument RATIOS
DATA_SPLIT = 'spartition'
RATIOS = [0.5, 0.1, 0.2, 0.1, 0.1]
# Should match the name of the task in the task list and is case sensitive
TASK_NAME = 'COVID Lung Ultrasound'
# can be either 'Train Alone' or 'Train Distributed'. Should match the text of the button in the train screen.
TRAINING_TYPE = 'Train Distributed' 
# Currently we take the first `NUM_IMAGES` in the folder for each peer. We should make a more complex distribution.
NUM_IMAGES = 100
# paths to folders containing covid positive and coivd negative patients

if platform.system() == 'Linux':
    POSITIVE_CLASS_PATH = r'preprocessed_images/covid-positive'
    NEGATIVE_CLASS_PATH = r'preprocessed_images/covid-negative'
else:
    POSITIVE_CLASS_PATH = r'preprocessed_images\covid-positive'
    NEGATIVE_CLASS_PATH = r'preprocessed_images\covid-negative'

start_time = time.time()

op = webdriver.ChromeOptions()
op.add_argument('headless') 
drivers = [webdriver.Chrome(ChromeDriverManager().install()) for i in range(NUM_PEERS)]
# drivers = [webdriver.Chrome(ChromeDriverManager().install(), opt) for i in range(NUM_PEERS)]

positive_files = get_files(POSITIVE_CLASS_PATH, NUM_IMAGES, '.png')
negative_files = get_files(NEGATIVE_CLASS_PATH, NUM_IMAGES, '.png')

if DATA_SPLIT == 'partition':
    pos_partitions = img_partition(positive_files, NUM_PEERS)
    neg_partitions = img_partition(negative_files, NUM_PEERS)
elif DATA_SPLIT == 'rpartition':
    pos_partitions = img_r_partition(positive_files, NUM_PEERS)
    neg_partitions = img_r_partition(negative_files, NUM_PEERS)
elif DATA_SPLIT == 'spartition':
    pos_partitions = img_s_partition(positive_files, RATIOS)
    neg_partitions = img_s_partition(negative_files, RATIOS)

for index, driver in enumerate(drivers):
    # Click 'Start Building' on home page
    find_task_page(driver, PLATFORM, TASK_NAME)

    # Upload files on Task Training
    time.sleep(6)
    if DATA_SPLIT == 'iid':
        driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Positive').send_keys(' \n '.join(positive_files))
        driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Negative').send_keys(' \n '.join(negative_files))
    else:
        driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Positive').send_keys(' \n '.join(pos_partitions[index]))
        driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Negative').send_keys(' \n '.join(neg_partitions[index]))

# Start training on each driver
start_training(drivers, TRAINING_TYPE)
train_start_time = time.time()

# Print accuracy after training
print_train_acc(drivers, start_time, 'val_trainingAccuracy_lus-covid-model', 'val_validationAccuracy_lus-covid-model')

# Print epochs/s metric
calculate_epoch_per_second(drivers, train_start_time, 2)

for driver in drivers:
    driver.quit()

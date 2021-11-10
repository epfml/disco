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
import random 
import math
from selenium.webdriver.common.action_chains import ActionChains
import os
import platform
from webdriver_manager.chrome import ChromeDriverManager

from util import calculate_epoch_per_second

# Platform
PLATFORM = 'https://epfml.github.io/DeAI/#' #"https://epfml.github.io/DeAI/#/" for Decentralized learning
# Defines how many browser tabs to open
NUM_PEERS  = 3
# Defines the way to split the data,could be 'iid' for iid data, 'partition' for even size partitions, 'rparition' for random size partitions
# 'spartition' for partition of sizes past as argument RATIOS
DATA_SPLIT = 'iid'
RATIOS = [0.66, 0.33]
# Should match the name of the task in the task list and is case sensitive
TASK_NAME = 'COVID Lung Ultrasound'
# can be either 'Train Alone' or 'Train Distributed'. Should match the text of the button in the train screen.
TRAINING_TYPE = 'Train Distributed' 
# Currently we take the first `NUM_IMAGES` in the folder for each peer. We should make a more complex distribution.
NUM_IMAGES = 15
# paths to folders containing covid positive and coivd negative patients

if platform.system() == 'Linux':
    POSITIVE_CLASS_PATH = r'preprocessed_images/covid-positive'
    NEGATIVE_CLASS_PATH = r'preprocessed_images/covid-negative'
else:
    POSITIVE_CLASS_PATH = r'preprocessed_images\covid-positive'
    NEGATIVE_CLASS_PATH = r'preprocessed_images\covid-negative'

start_time = time.time()

def get_files(directory, num_images):
    files = []
    for dirpath,_,filenames in os.walk(directory):
        for f in filenames:
            if '.png' in f:
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

# drivers = [webdriver.Chrome(executable_path=r"chromedriver.exe") for i in range(NUM_PEERS)]
op = webdriver.ChromeOptions()
op.add_argument('headless') 
drivers = [webdriver.Chrome(ChromeDriverManager().install()) for i in range(NUM_PEERS)]
# drivers = [webdriver.Chrome(ChromeDriverManager().install(), opt) for i in range(NUM_PEERS)]

positive_files = get_files(POSITIVE_CLASS_PATH, NUM_IMAGES)
negative_files = get_files(NEGATIVE_CLASS_PATH, NUM_IMAGES)

if DATA_SPLIT == 'partition':
    positive_partitions = partition(positive_files, NUM_PEERS)
    negative_partitions = partition(negative_files, NUM_PEERS)
elif DATA_SPLIT == 'rpartition':
    r_positive_partitions = r_partition(positive_files, NUM_PEERS)
    r_negative_partitions = r_partition(negative_files, NUM_PEERS)
elif DATA_SPLIT == 'spartition':
    s_positive_partitions = s_partition(positive_files, RATIOS)
    s_negative_partitions = s_partition(negative_files, RATIOS)


for index, driver in enumerate(drivers):
    # Click 'Start Building' on home page
    driver.get(PLATFORM)
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if 'Start building' in elem.get_attribute('innerHTML'):
            elem.click()

     # Find LUS-Covid task and click 'Join' on task list page
    time.sleep(0.5)
    elements = driver.find_elements_by_css_selector('div.group')
    for element in elements:
        if TASK_NAME in element.get_attribute('innerHTML'):
            button = element.find_element_by_tag_name('button')
    button.click()

    # Click 'Join Training' on Task Description page
    time.sleep(2)
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if 'Join Training' in elem.get_attribute('innerHTML'):
            elem.click()

    # Upload files on Task Training
    time.sleep(4)
    if DATA_SPLIT == 'iid':
        driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Positive').send_keys(' \n '.join(positive_files))
        driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Negative').send_keys(' \n '.join(negative_files))
    elif DATA_SPLIT == 'partition':
        driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Positive').send_keys(' \n '.join(positive_partitions[index]))
        driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Negative').send_keys(' \n '.join(negative_partitions[index]))
    elif DATA_SPLIT == 'rpartition':
        driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Positive').send_keys(' \n '.join(r_positive_partitions[index]))
        driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Negative').send_keys(' \n '.join(r_negative_partitions[index]))
    elif DATA_SPLIT == 'spartition':
        driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Positive').send_keys(' \n '.join(s_positive_partitions[index]))
        driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Negative').send_keys(' \n '.join(s_negative_partitions[index]))



# Start training on each driver
for driver in drivers:
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if TRAINING_TYPE in elem.get_attribute('innerHTML'):
            driver.execute_script("arguments[0].scrollIntoView();", elem)
            elem.click()
            break

continue_searcing = True

while continue_searcing:
    if len(drivers[0].find_elements_by_xpath("//*[@class='c-toast c-toast--success c-toast--bottom-right']")) > 0:
        for f in drivers[0].find_elements_by_xpath("//*[@class='c-toast c-toast--success c-toast--bottom-right']"):
            if 'has finished training' in f.text:
                print(f"Train accuracy = {drivers[0].find_element_by_id('val_trainingAccuracy_lus-covid-model').text}")
                print(f"Validation accuracy = {drivers[0].find_element_by_id('val_validationAccuracy_lus-covid-model').text}")
                print("Training took: %s seconds" % (time.time() - start_time))
                continue_searcing = False
                break

calculate_epoch_per_second(drivers, 4, 3)

for driver in drivers:
    driver.quit()


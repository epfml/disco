""" Runs the Titanic task on DeAI or FeAI.

Constants: 
Use CSV_FILE_PATH to point to the csv data file. 
Use `NUM_PEERS` to define the number of peers to run.
Use `TRAINING_TYPE` to choose between training alone or distributed.

How to run:
python selenium_script_Titanic.py
"""

from selenium import webdriver
from selenium.webdriver.common.keys import Keys
import time
from selenium.webdriver.common.action_chains import ActionChains
import os
import platform
from webdriver_manager.chrome import ChromeDriverManager

from util import read_csv, create_csv, find_task_page, generate_report, get_files, img_partition, img_r_partition, img_s_partition, start_training


#Platform
PLATFORM = 'https://epfml.github.io/DeAI/#/' #"https://epfml.github.io/DeAI/#/" for Decentralized learning
# Defines how many browser tabs to open
NUM_PEERS  = 2
# Should match the name of the task in the task list and is case sensitive
TASK_NAME = 'Titanic'
# can be either 'Train Alone' or 'Train Distributed'. Should match the text of the button in the train screen.
TRAINING_MODE = 'Decentralised'
TRAINING_TYPE = 'decentralised' 
# paths to the file containing the CSV file of Titanic passengers with 12 columns
CSV_FILE_PATH = 'train.csv'

TIME_OFFSETS = [0, 0, 0]
RATIOS = [0.5, 0.5]

DATA_SPLIT = 'spartition'


# Download and extract chromedriver from here: https://sites.google.com/a/chromium.org/chromedriver/downloads
# Not neccesary after ChromeDriverManager
start_time = time.time()

# op = webdriver.ChromeOptions()
# op.add_argument('headless') 
drivers = [webdriver.Chrome(ChromeDriverManager().install()) for i in range(NUM_PEERS)]
# drivers = [webdriver.Chrome(ChromeDriverManager().install(), opt) for i in range(NUM_PEERS)]

data = read_csv(CSV_FILE_PATH)
header = data[0]

# res = img_s_partition(data[1:], RATIOS)

# print(len(res))

# for index, r in enumerate(res):   
#     create_csv(header, r, f"testing_{index}.csv")
# print(data[1])


if DATA_SPLIT == 'partition':
    res = img_partition(data, NUM_PEERS)
    for index, r in enumerate(res):   
        create_csv(header, r, f"{index}_partition.csv")
elif DATA_SPLIT == 'rpartition':
    res = img_r_partition(data, NUM_PEERS)
    for index, r in enumerate(res):   
        create_csv(header, r, f"{index}_partition.csv")
elif DATA_SPLIT == 'spartition':
    res = img_s_partition(data, RATIOS)
    for index, r in enumerate(res):   
        create_csv(header, r, f"{index}_partition.csv")

for index, driver in enumerate(drivers):
    # Click 'Start Building' on home page
    find_task_page(driver, PLATFORM, TASK_NAME, TRAINING_MODE)

    # Upload files on Task Training
    time.sleep(6)
    if DATA_SPLIT == 'iid':
        driver.find_element_by_id('hidden-input_titanic_1').send_keys(os.path.abspath(CSV_FILE_PATH))
    else:
        driver.find_element_by_id('hidden-input_titanic_1').send_keys(os.path.abspath(str(index) + '_partition.csv'))

# Start training on each driver
start_training(drivers, TRAINING_TYPE, TIME_OFFSETS)
train_start_time = time.time()

generate_report('report.txt', \
    drivers, \
    start_time, \
    train_start_time, \
    '//*[@id="app"]/div/div/div/div/div/div/div/main/div/div/div[4]/div[1]/div/div[1]/p/span[1]', \
    '//*[@id="app"]/div/div/div/div/div/div/div/main/div/div/div[4]/div[1]/div/div[2]/p/span[1]', \
    2) 

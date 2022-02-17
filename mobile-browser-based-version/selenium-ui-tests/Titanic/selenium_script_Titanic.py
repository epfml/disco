""" Runs the Titanic task on DeAI or FeAI.

Constants: 
Use 'PLATFORM' to choose the platform (FeAI or DeAI)
Use `CSV_FILE_PATH` to point to the data file. 
Use `NUM_PEERS` to define the number of peers to run.
Use `TRAINING_TYPE` to choose between training alone or distributed.
Use `TRAINING_MODE` to choose between Decentralised or Federated.
Use `DATA_SPLIT` to choose the data split
Use `TIME_OFFSETS` to choose the time offsets to simulate asynchronous learning

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

import sys,os

sys.path.append(os.path.realpath('..'))

from util import read_csv, create_csv, find_task_page, generate_report, get_files, partition, r_partition, s_partition, start_training


#Platform
PLATFORM = 'https://epfml.github.io/DeAI/#/'
# can be either 'Train Alone' or 'Decentralised'/'Federated'. Should match the text of the button in the train screen.
TRAINING_MODE = 'Federated'
# Defines how many browser tabs to open
NUM_PEERS  = 2
# Should match the name of the task in the task list and is case sensitive
TASK_NAME = 'Titanic'
#Can be picked to be 'decentralised'/'federated' or 'locally'
TRAINING_TYPE = 'federated' 
# paths to the file containing the CSV file of Titanic passengers with 12 columns
CSV_FILE_PATH = 'train.csv'
#You can set time offsets for nodes to join at variable times
TIME_OFFSETS = [0, 0, 0]
# Defines the way to split the data,could be 'iid' for iid data, 'partition' for even size partitions, 'rparition' for random size partitions
# 'spartition' for partition of sizes past as argument RATIOS
DATA_SPLIT = 'rpartition'
RATIOS = [0.5, 0.3, 0.2]

start_time = time.time()

drivers = [webdriver.Chrome(ChromeDriverManager().install()) for i in range(NUM_PEERS)]

data = read_csv(CSV_FILE_PATH)
header = data[0]

if DATA_SPLIT == 'partition':
    res = partition(data, NUM_PEERS)
    for index, r in enumerate(res):   
        create_csv(header, r, f"{index}_partition.csv")
elif DATA_SPLIT == 'rpartition':
    res = r_partition(data, NUM_PEERS)
    for index, r in enumerate(res):   
        create_csv(header, r, f"{index}_partition.csv")
elif DATA_SPLIT == 'spartition':
    res = s_partition(data, RATIOS)
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

generate_report('report.txt', \
    drivers, \
    start_time, \
    '//*[@id="app"]/div/div/div/div/div/div/div/main/div/div/div[4]/div/div[1]/div/div[2]/p/span[1]', \
    '//*[@id="app"]/div/div/div/div/div/div/div/main/div/div/div[4]/div/div[1]/div/div[1]/p/span[1]', \
    2) 

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

How to run:
python run_lus_covid.py
"""

from selenium import webdriver
from selenium.webdriver.common.keys import Keys
import time
from selenium.webdriver.common.action_chains import ActionChains
import os
import platform
from webdriver_manager.chrome import ChromeDriverManager

#Platform
PLATFORM = 'https://epfml.github.io/FeAI/#' #"https://epfml.github.io/DeAI/#/" for Decentralized learning
# Defines how many browser tabs to open
NUM_PEERS  = 1
# Should match the name of the task in the task list and is case sensitive
TASK_NAME = 'Titanic'
# can be either 'Train Alone' or 'Train Distributed'. Should match the text of the button in the train screen.
TRAINING_TYPE = 'Train Distributed' 
# paths to the file containing the CSV file of Titanic passengers with 12 columns
CSV_FILE_PATH = 'train.csv'

# Download and extract chromedriver from here: https://sites.google.com/a/chromium.org/chromedriver/downloads
# Not neccesary after ChromeDriverManager
op = webdriver.ChromeOptions()
op.add_argument('headless') 
drivers = [webdriver.Chrome(ChromeDriverManager().install()) for i in range(NUM_PEERS)]

for driver in drivers:
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
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if 'Join Training' in elem.get_attribute('innerHTML'):
            elem.click()

    # Upload files on Task Training
    time.sleep(4)
    driver.find_element_by_id('hidden-input_titanic-model_1').send_keys(os.path.abspath(CSV_FILE_PATH))

# Start training on each driver
for driver in drivers:
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if TRAINING_TYPE in elem.get_attribute('innerHTML'):
            driver.execute_script("arguments[0].scrollIntoView();", elem)
            elem.click()
            break

time.sleep(15)

print(f"Train accuracy = {drivers[0].find_element_by_id('val_trainingAccuracy_titanic-model').text}")
print(f"Validation accuracy = {drivers[0].find_element_by_id('val_validationAccuracy_titanic-model').text}")

for driver in drivers:
    driver.quit()

# TODO:
#    +1. MacOS and linux directory check
#    +2. Check wheter it's possible to not open UI, DO
#     3. Graphs
#     4. More customisation
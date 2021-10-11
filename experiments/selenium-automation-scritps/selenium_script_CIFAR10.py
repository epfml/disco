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
from selenium.webdriver.common.keys import Keys
import time
from selenium.webdriver.common.action_chains import ActionChains
import os
import platform
from webdriver_manager.chrome import ChromeDriverManager

#Platform
PLATFORM = 'https://epfml.github.io/DeAI/#' #"https://epfml.github.io/DeAI/#/" for Decentralized learning
# Defines how many browser tabs to open
NUM_PEERS  = 1
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
drivers = [webdriver.Chrome(ChromeDriverManager().install(), options=op) for i in range(NUM_PEERS)]

def get_files(directory, num_images):
    files = []
    for dirpath,_,filenames in os.walk(directory):
        for f in filenames:
            if '.png' in f:
                files.append(os.path.abspath(os.path.join(dirpath, f)))
    return ' \n '.join(files[:num_images])

for driver in drivers:
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
    print("Hello \n")
    driver.find_element_by_id('hidden-input_cifar10-model_Images').send_keys(get_files(IMAGE_FILE_PATH, 4))
    driver.find_element_by_id('hidden-input_cifar10-model_Labels').send_keys(os.path.abspath(LABEL_FILE_PATH))

# Start training on each driver
for driver in drivers:
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if TRAINING_TYPE in elem.get_attribute('innerHTML'):
            driver.execute_script("arguments[0].scrollIntoView();", elem)
            elem.click()
            break

time.sleep(15)

#Print out the Accuracy after training
print(f"Train accuracy = {drivers[0].find_element_by_id('val_trainingAccuracy_cifar10-model').text}")
print(f"Validation accuracy = {drivers[0].find_element_by_id('val_validationAccuracy_cifar10-model').text}")

for driver in drivers:
    driver.quit()

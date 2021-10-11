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
import os
import platform
from webdriver_manager.chrome import ChromeDriverManager

#Platform
PLATFORM = 'https://epfml.github.io/FeAI/#' #"https://epfml.github.io/DeAI/#/" for Decentralized learning
# Defines how many browser tabs to open
NUM_PEERS = 1
# Should match the name of the task in the task list and is case sensitive
TASK_NAME = 'MNIST'
# can be either 'Train Alone' or 'Train Distributed'. Should match the text of the button in the train screen.
TRAINING_TYPE = 'Train Distributed' 
#Number of images to train with
NUM_IMAGES = 10
# paths to the file containing the CSV file of Titanic passengers with 12 columns
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

def get_files(directory, num_images):
    files = []
    for dirpath,_,filenames in os.walk(directory):
        for f in filenames:
            if '.jpg' in f:
                files.append(os.path.abspath(os.path.join(dirpath, f)))
    return ' \n '.join(files[:num_images])

# Download and extract chromedriver from here: https://sites.google.com/a/chromium.org/chromedriver/downloads
# Not neccesary after ChromeDriverManager
op = webdriver.ChromeOptions()
op.add_argument('headless') 
drivers = [webdriver.Chrome(ChromeDriverManager().install(), options=op) for i in range(NUM_PEERS)]

for driver in drivers:
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
    time.sleep(4)
    driver.find_element_by_id('hidden-input_mnist-model_0').send_keys(get_files(DIGIT_CLASS_PATHS[0], NUM_IMAGES))
    driver.find_element_by_id('hidden-input_mnist-model_1').send_keys(get_files(DIGIT_CLASS_PATHS[1], NUM_IMAGES))
    driver.find_element_by_id('hidden-input_mnist-model_2').send_keys(get_files(DIGIT_CLASS_PATHS[2], NUM_IMAGES))
    driver.find_element_by_id('hidden-input_mnist-model_3').send_keys(get_files(DIGIT_CLASS_PATHS[3], NUM_IMAGES))
    driver.find_element_by_id('hidden-input_mnist-model_4').send_keys(get_files(DIGIT_CLASS_PATHS[4], NUM_IMAGES))
    driver.find_element_by_id('hidden-input_mnist-model_5').send_keys(get_files(DIGIT_CLASS_PATHS[5], NUM_IMAGES))
    driver.find_element_by_id('hidden-input_mnist-model_6').send_keys(get_files(DIGIT_CLASS_PATHS[6], NUM_IMAGES))
    driver.find_element_by_id('hidden-input_mnist-model_4').send_keys(get_files(DIGIT_CLASS_PATHS[7], NUM_IMAGES))
    driver.find_element_by_id('hidden-input_mnist-model_5').send_keys(get_files(DIGIT_CLASS_PATHS[8], NUM_IMAGES))
    driver.find_element_by_id('hidden-input_mnist-model_6').send_keys(get_files(DIGIT_CLASS_PATHS[9], NUM_IMAGES))

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
print(f"Train accuracy = {drivers[0].find_element_by_id('val_trainingAccuracy_mnist-model').text}")
print(f"Validation accuracy = {drivers[0].find_element_by_id('val_validationAccuracy_mnist-model').text}")

for driver in drivers:
    driver.quit()

# TODO:
#    +1. MacOS and linux directory check
#    +2. Check wheter it's possible to not open UI, DO
#     3. Graphs
#     4. More customisation
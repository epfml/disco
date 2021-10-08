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
NUM_PEERS  = 2
# Should match the name of the task in the task list and is case sensitive
TASK_NAME = 'COVID Lung Ultrasound'
# can be either 'Train Alone' or 'Train Distributed'. Should match the text of the button in the train screen.
TRAINING_TYPE = 'Train Distributed' 
# Currently we take the first `NUM_IMAGES` in the folder for each peer. We should make a more complex distribution.
NUM_IMAGES = 10
# paths to folders containing covid positive and coivd negative patients
POSITIVE_CLASS_PATH = ''
NEGATIVE_CLASS_PATH = ''
if platform.system() == 'Linux':
    POSITIVE_CLASS_PATH = r'preprocessed_images/covid-positive'
    NEGATIVE_CLASS_PATH = r'preprocessed_images/covid-negative'
else:
    POSITIVE_CLASS_PATH = r'preprocessed_images\covid-positive'
    NEGATIVE_CLASS_PATH = r'preprocessed_images\covid-negative'
def get_files(directory, num_images):
    files = []
    for dirpath,_,filenames in os.walk(directory):
        for f in filenames:
            if '.png' in f:
                files.append(os.path.abspath(os.path.join(dirpath, f)))
    return ' \n '.join(files[:num_images])

print(platform.system())

# Download and extract chromedriver from here: https://sites.google.com/a/chromium.org/chromedriver/downloads
# Not neccesary after ChromeDriverManager

# drivers = [webdriver.Chrome(executable_path=r"chromedriver.exe") for i in range(NUM_PEERS)]
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
    driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Positive').send_keys(get_files(POSITIVE_CLASS_PATH, NUM_IMAGES))
    driver.find_element_by_id('hidden-input_lus-covid-model_COVID-Negative').send_keys(get_files(NEGATIVE_CLASS_PATH, NUM_IMAGES))

# Start training on each driver
for driver in drivers:
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if TRAINING_TYPE in elem.get_attribute('innerHTML'):
            driver.execute_script("arguments[0].scrollIntoView();", elem)
            elem.click()
            break

time.sleep(15)

print(f"Train accuracy = {drivers[0].find_element_by_id('val_trainingAccuracy_lus-covid-model').text}")
print(f"Validation accuracy = {drivers[0].find_element_by_id('val_validationAccuracy_lus-covid-model').text}")

for driver in drivers:
    driver.quit()

# TODO:
#    +1. MacOS and linux directory check
#    +2. Check wheter it's possible to not open UI, DO
#     3. Graphs
#     4. More customisation
import os
import random
import csv
import time
import math
import psutil


""" Calculates executed epochs per second

Arguments: 
'drivers' activated browser drivers
'train_start_time' time of training start
'epoch_index' index of the HTML element that contains the averaging number
'report_file' report file to write the result
"""

def calculate_epoch_per_second(drivers, train_start_time, epoch_index, report_file):
    total_averaging_count = 0
    for driver in drivers:
        elems = driver.find_elements_by_xpath("//*[@class='text-xl font-semibold']")
        total_averaging_count += int(elems[epoch_index].text)
    epoch_count = total_averaging_count / len(drivers)
    training_time = time.time() - train_start_time
    report_file.write(f'Epochs/s was: {round(epoch_count / training_time, 5)} \n')

""" Calculates executed epochs per second

Arguments: 
'directory' directory containing the files
'num_images' number of images to upload
'file_type' extention of the file type
"""

def get_files(directory, num_images, file_type):
    files = []
    for dirpath,_,filenames in os.walk(directory):
        for f in filenames:
            if file_type in f:
                files.append(os.path.abspath(os.path.join(dirpath, f)))
    return files[:num_images]

""" Reads a CSV file to a list

Arguments: 
'file_path' file path
"""

def read_csv(file_path):
    with open(file_path, newline='') as csvfile:
        results = list(csv.reader(csvfile))
    return results

""" Writes a list to a CSV file

Arguments: 
'filename' file name of the new CSV file
'header' first row of the file
'data' the list to write
"""

def create_csv(header, data, filename):
    with open(filename, 'w') as f:
        write = csv.writer(f)
        write.writerow(header)
        write.writerows(data)

""" Return a partition of a list

Arguments: 
'list_in' list to partition
'partition_number' number of partitions
"""

def partition(list_in, partition_number):
    random.shuffle(list_in)
    return [list_in[i::partition_number] for i in range(partition_number)]

""" Return a random sized partition of a list

Arguments: 
'list_in' list to partition
'partition_number' number of partitions
"""

def r_partition(list_in, partition_number):
    random.shuffle(list_in)
    partition_indices = []
    list_out = []
    for _ in range(partition_number - 1):
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

""" Return a provided sized partition of a list

Arguments: 
'list_in' list to partition
'ratios' what ratio of the list should be present in each partition
"""

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

""" Return avreage accuracy of all browser tabs
Arguments: 
'drivers' activated browser drivers
'train_acc_element_id' Xpath of training accuracy element
'val_acc_element_id' Xpath of validation accuracy element
"""

def calculate_average_acc(drivers, train_acc_element_id, val_acc_element_id):
    total_train_acc = 0
    total_val_acc = 0
    for driver in drivers:
        total_train_acc += float(driver.find_elements_by_xpath(train_acc_element_id)[0].text)
        total_val_acc += float(driver.find_elements_by_xpath(val_acc_element_id)[0].text)
    return total_train_acc / len(drivers), total_val_acc / len(drivers)

""" Return avreage accuracy of all browser tabs
Arguments: 
'drivers' activated browser drivers
'start_time' start time of training
'train_acc_element_id' Xpath of training accuracy element
'val_acc_element_id' Xpath of validation accuracy element
'report file' file to write the report of the simulation to
"""

def print_metrics(drivers, start_time, train_acc_element_id, val_acc_element_id, report_file):
    continue_searcing = True
    monitoring_count = 0
    total_ram = 0
    total_cpu = 0
    max_cpu = 0
    temp_cpu = 0
    pid = os.getpid()
    chrome_pids = [driver.service.process.pid for driver in drivers]
    chrome_processes = [psutil.Process(p) for p in chrome_pids]
    python_process = psutil.Process(pid)
    while continue_searcing:
        if int(time.time() - start_time) % 2 == 0:
            monitoring_count += 1
            memory_usage = python_process.memory_percent()
            cpu_usage = python_process.cpu_percent()
            total_ram += memory_usage
            total_cpu += cpu_usage
            temp_cpu += cpu_usage
            for cp in chrome_processes:
                memory_usage = cp.memory_percent()
                cpu_usage = cp.cpu_percent()
                total_ram += memory_usage
                total_cpu += cpu_usage
                temp_cpu += cpu_usage
            max_cpu = max(temp_cpu, max_cpu)
            temp_cpu = 0
        
        if len(drivers[len(drivers) - 1].find_elements_by_xpath('//*[@id="mapHeader"]/ul/li/div/span')) > 0:
            for f in drivers[len(drivers) - 1].find_elements_by_xpath('//*[@id="mapHeader"]/ul/li/div/span'):
                if 'Training finished' in f.text:
                    train_acc, val_acc = calculate_average_acc(drivers, train_acc_element_id, val_acc_element_id)
                    report_file.write(f"Train accuracy = {round(train_acc, 2)} \n")
                    report_file.write(f"Validation accuracy = {round(val_acc, 2)} \n")
                    report_file.write(f"Total Training time was: {round(time.time() - start_time, 2)} seconds \n")
                    continue_searcing = False
                    break
    report_file.write(f'Average CPU usage was: {round(total_cpu / monitoring_count, 2)}% \n')
    report_file.write(f'Average RAM usage was: {round(total_ram / monitoring_count, 2)}% \n')
    report_file.write(f'Max CPU usage was: {round(max_cpu, 2)}% \n')

""" Picks training mode on all drivers
Arguments: 
'drivers' activated browser drivers
'training_mode' training mode to choose
"""

def pick_training_mode(driver, training_mode='Federated'):
    settings = driver.find_element_by_xpath("//a[@data-title='Settings']")
    settings.click()
    time.sleep(2)
    if training_mode != "Decentralised":
        driver.find_element_by_xpath('//*[@id="app"]/div/div/aside/div/div/section/div[2]/div[2]/div[1]/div/button[2]').click()
        time.sleep(1)
        driver.find_element_by_xpath('//*[@id="app"]/div/div/aside/div/div/section/div[2]/div[2]/div[2]/div/button[2]').click()
    driver.find_element_by_xpath('//*[@id="app"]/div/div/aside/div/div/section/div[1]/button').click()


""" Starts training on all drivers
Arguments: 
'drivers' activated browser drivers
'training_type' training type to choose between decentralised/federated and local
'time_offsets' time offsets to simulate asynchronous learning
"""
def start_training(drivers, training_type, time_offsets):
    for index, driver in enumerate(drivers):
        time.sleep(time_offsets[index])
        elements = driver.find_elements_by_tag_name('button')
        for elem in elements:
            if training_type in elem.get_attribute('innerHTML'):
                driver.execute_script("arguments[0].scrollIntoView();", elem)
                elem.click()
                break


""" Finds the task page on each driver
Arguments: 
'drivers' activated browser drivers
'platform' platform for training
'task_name' name of the task
'training_mode' training type to choose between decentralised and federated
"""

def find_task_page(driver, platform, task_name, training_mode):
    driver.get(platform)
    time.sleep(2)
    pick_training_mode(driver, training_mode)
    time.sleep(1)
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if 'Start building' in elem.get_attribute('innerHTML'):
            elem.click()
            break
    # Find the task and click 'Join' on task list page
    time.sleep(2)
    elements = driver.find_elements_by_css_selector('div.group')
    for element in elements:
        if task_name in element.get_attribute('innerHTML'):
            button = element.find_element_by_tag_name('button')
    button.click()

    # Click 'Join Training' on Task Description page
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if 'Join Training' in elem.get_attribute('innerHTML'):
            elem.click()


""" Generates the report
Arguments: 
'report_file_name' reports file name
'drivers' activated browser drivers
'start_time' start time of training
'train_acc_element_id' Xpath of training accuracy element
'val_acc_element_id' Xpath of validation accuracy element
'epoch_index' index of the HTML element that contains the averaging number
"""

def generate_report(report_file_name, drivers, start_time, train_acc_element_id, val_acc_element_id, epoch_index):
    f = open(report_file_name, "w")
    f.write(f'Using {len(drivers)} to simulate distributed learning: \n')
    print_metrics(drivers, start_time, train_acc_element_id, val_acc_element_id, f)
    calculate_epoch_per_second(drivers, start_time, epoch_index, f)


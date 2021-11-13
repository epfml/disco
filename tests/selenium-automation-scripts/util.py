import os
import random
import csv
import time
import math
import psutil


def calculate_epoch_per_second(drivers, train_start_time, epoch_index, report_file):
    #epoch_index is the index of the HTML element that contains the averaging number
    total_averaging_count = 0
    for driver in drivers:
        elems = driver.find_elements_by_xpath("//*[@class='text-xl font-semibold']")
        total_averaging_count += int(elems[epoch_index].text)
    epoch_count = total_averaging_count / len(drivers)
    training_time = time.time() - train_start_time
    report_file.write(f'Epochs/s was: {round(epoch_count / training_time, 2)} \n')

def get_files(directory, num_images, file_type):
    files = []
    for dirpath,_,filenames in os.walk(directory):
        for f in filenames:
            if file_type in f:
                files.append(os.path.abspath(os.path.join(dirpath, f)))
    return files[:num_images]
def img_partition(list_in, n):
    random.shuffle(list_in)
    return [list_in[i::n] for i in range(n)]

def read_csv(file_path):
    with open(file_path, newline='') as f:
        reader = csv.reader(f)
        results = dict(reader) 
    return results

def create_csv(dic, name):
    with open(name, 'w') as f:
        for key in dic.keys():
            f.write(f"{key},{dic[key]}\n")

def img_r_partition(list_in, n):
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

def img_s_partition(list_in, ratios):
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

def calculate_average_acc(drivers, train_acc_element_id, val_acc_element_id):
    total_train_acc = 0
    total_val_acc = 0
    for driver in drivers:
        total_train_acc += float(driver.find_element_by_id(train_acc_element_id).text)
        total_val_acc += float(driver.find_element_by_id(val_acc_element_id).text)
    return total_train_acc / len(drivers), total_val_acc / len(drivers)


def print_metrics(drivers, start_time, train_acc_element_id, val_acc_element_id, report_file):
    continue_searcing = True
    monitoring_count = 0
    total_ram = 0
    total_cpu = 0
    pid = os.getpid()
    python_process = psutil.Process(pid)
    print(pid)

    while continue_searcing:
        if int(time.time() - start_time) % 2 == 0:
            monitoring_count += 1
            memory_usage = python_process.memory_percent()
            cpu_usage = python_process.cpu_percent()
            total_ram += memory_usage
            total_cpu += cpu_usage
        if len(drivers[len(drivers) - 1].find_elements_by_xpath("//*[@class='c-toast c-toast--success c-toast--bottom-right']")) > 0:
            for f in drivers[len(drivers) - 1].find_elements_by_xpath("//*[@class='c-toast c-toast--success c-toast--bottom-right']"):
                if 'has finished training' in f.text:
                    train_acc, val_acc = calculate_average_acc(drivers, train_acc_element_id, val_acc_element_id)
                    report_file.write(f"Train accuracy = {round(train_acc, 2)} \n")
                    report_file.write(f"Validation accuracy = {round(val_acc, 2)} \n")
                    report_file.write(f"Total Training time was: {round(time.time() - start_time, 2)} seconds \n")
                    continue_searcing = False
                    break
    report_file.write(f'Average CPU usage was: {round(total_cpu / monitoring_count, 2)}% \n')
    report_file.write(f'Average RAM usage was: {round(total_ram / monitoring_count, 2)}% \n')

def start_training(drivers, training_type):
    for driver in drivers:
        elements = driver.find_elements_by_tag_name('button')
        for elem in elements:
            if training_type in elem.get_attribute('innerHTML'):
                driver.execute_script("arguments[0].scrollIntoView();", elem)
                elem.click()
                break

def find_task_page(driver, platform, task_name):
    driver.get(platform)
    elements = driver.find_elements_by_tag_name('button')
    for elem in elements:
        if 'Start building' in elem.get_attribute('innerHTML'):
            elem.click()

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

def generate_report(report_file_name, drivers, start_time, train_start_time, train_acc_element_id, val_acc_element_id, epoch_index):
    f = open(report_file_name, "w")
    f.write(f'Using {len(drivers)} to simulate distributed learning: \n')
    print_metrics(drivers, start_time, train_acc_element_id, val_acc_element_id, f)
    calculate_epoch_per_second(drivers, train_start_time, epoch_index, f)

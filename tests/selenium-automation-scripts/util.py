import os
import random
import csv
import time
import math


def calculate_epoch_per_second(drivers, train_start_time, epoch_index):
    total_averaging_count = 0
    total_wait_time = 0.0
    for driver in drivers:
        elems = driver.find_elements_by_xpath("//*[@class='text-xl font-semibold']")
        total_averaging_count += int(elems[epoch_index].text)
        
    epoch_count = total_averaging_count / len(drivers)
    training_time = time.time() - train_start_time
        # print((elems[time_index].text)[:len(elems[time_index].text)])
        # total_wait_time += float((elems[time_index].text)[:len(elems[time_index].text) - 4])
    print(f'Epochs/s was: {round(epoch_count / training_time, 2)}')

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

def img_csv_partition(list_in, n, label_path):
    x = list(enumerate(list_in))
    random.shuffle(x)
    indices, ls = zip(*x)
    labels = read_csv(label_path)

    for i in range(n):
        temp_dic = {str(k): labels[str(k)] for k in indices[i::n]}
        create_csv(temp_dic, str(i) + '_partition.csv')
    return [(ls[i::n]) for i in range(n)]

def img_csv_r_parirtion(list_in, n, label_path):
    x = list(enumerate(list_in))
    random.shuffle(x)
    indices, ls = zip(*x)
    labels = read_csv(label_path)
    partition_indices = []
    indices_out = [] 
    list_out = []
    for _ in range(n - 1):
        rand_index = random.randint(1, len(list_in) - 1)
        while rand_index in partition_indices:
            rand_index = random.randint(1, len(list_in) - 1)
        partition_indices.append(rand_index)
    partition_indices = sorted(partition_indices)

    for i in range(len(partition_indices)):
        if i == 0:
            list_out.append(ls[0:partition_indices[i]])
            indices_out.append(indices[0:partition_indices[i]])
        else:
            list_out.append(ls[partition_indices[i - 1]:partition_indices[i]])
            indices_out.append(indices[partition_indices[i - 1]:partition_indices[i]])

    list_out.append(ls[partition_indices[len(partition_indices) - 1]:])
    indices_out.append(indices[partition_indices[len(partition_indices) - 1]:])

    for i in range(n):
        temp_dic = {str(k): labels[str(k)] for k in indices_out[i]}
        create_csv(temp_dic, str(i) + '_partition.csv')

    return list_out

def img_csv_s_parirtion(list_in, ratios, label_path):
    print(list_in)
    x = list(enumerate(list_in))
    random.shuffle(x)
    indices, ls = zip(*x)
    # print(indices)
    # print(ls)
    labels = read_csv(label_path)
    # print(labels[:10])
    partition_indices = []
    indices_out = [] 
    list_out = []
    for i in range(len(ratios)):
        curr_slice_index = math.ceil(ratios[i] * len(ls))
        if i == 0:
            partition_indices.append(int(curr_slice_index))
        else:
            partition_indices.append(int(partition_indices[i - 1] + curr_slice_index))
    for i in range(len(partition_indices)):
        if i == 0:
            list_out.append(ls[0:partition_indices[i]])
            indices_out.append(indices[0:partition_indices[i]])
        else:
            list_out.append(ls[partition_indices[i - 1]:partition_indices[i]])
            indices_out.append(indices[partition_indices[i - 1]:partition_indices[i]])
    print(list_out)
    print(indices_out)
    for i in range(len(indices_out)):
        temp_dic = {str(k): labels[str(k)] for k in indices_out[i]}
        print(temp_dic)
        create_csv(temp_dic, str(i) + '_partition.csv')
    return list_out

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


def print_train_acc(drivers, start_time, train_acc_element_id, val_acc_element_id):
    continue_searcing = True
    while continue_searcing:
        if len(drivers[len(drivers) - 1].find_elements_by_xpath("//*[@class='c-toast c-toast--success c-toast--bottom-right']")) > 0:
            for f in drivers[len(drivers) - 1].find_elements_by_xpath("//*[@class='c-toast c-toast--success c-toast--bottom-right']"):
                # print("Im here")
                if 'has finished training' in f.text:
                    train_acc, val_acc = calculate_average_acc(drivers, train_acc_element_id, val_acc_element_id)
                    print(f"Train accuracy = {round(train_acc, 2)}")
                    print(f"Validation accuracy = {round(val_acc, 2)}")
                    print(f"Total Training time was: {round(time.time() - start_time, 2)} seconds")
                    continue_searcing = False
                    break

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

    # Find CIFAR10 task and click 'Join' on task list page
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


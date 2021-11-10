def calculate_epoch_per_second(drivers, time_index, epoch_index):
    total_averaging_count = 0
    total_wait_time = 0.0
    for driver in drivers:
        elems = driver.find_elements_by_xpath("//*[@class='text-xl font-semibold']")
        total_averaging_count += int(elems[epoch_index].text)
        total_wait_time += float((elems[time_index].text)[:len(elems[time_index].text) - 4])
    print(f'Epochs/s was: {round(total_averaging_count / total_wait_time, 2)}')

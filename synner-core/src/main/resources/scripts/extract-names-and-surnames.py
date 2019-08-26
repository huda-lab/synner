# example
# python3 extract-names-and-surnames.py name-surname-gender-data.csv name-surname-gender-data2.csv name-surname-gender-data3.csv ...
# files are saved on the working dir

import csv
import sys
import random

data = []
first_name = { 'Male': {}, 'Female': {}, 'All': {} }
last_name = {}

#read
for i in range(1,len(sys.argv)):
    src = sys.argv[i]
    isFirstRow = True
    for row in csv.reader(open(src)):
        if isFirstRow:
            isFirstRow = False
            continue
        if row[0] in (first_name[row[2]]):
            first_name[row[2]][row[0]] += 1
        else:
            first_name[row[2]][row[0]] = 1

        if row[0] in (first_name['All']):
            first_name['All'][row[0]] += 1
        else:
            first_name['All'][row[0]] = 1
        
        if row[1] in last_name:
            last_name[row[1]] += 1
        else:
            last_name[row[1]] = 1

male_first_names = sorted(first_name['Male'].keys(), key=lambda k: k)
male_offset = first_name['Male'][(sorted(first_name['Male'].keys(), key=lambda k: first_name['Male'][k]))[0]] - 1
female_first_names = sorted(first_name['Female'].keys(), key=lambda k: k)
female_offset = first_name['Female'][(sorted(first_name['Female'].keys(), key=lambda k: first_name['Female'][k]))[0]] - 1
all_first_names = sorted(first_name['All'].keys(), key=lambda k: k)
all_first_names_offset = first_name['All'][(sorted(first_name['All'].keys(), key=lambda k: first_name['All'][k]))[0]] - 1
surnames = sorted(last_name.keys(), key=lambda k: k)
surnames_offset = last_name[(sorted(last_name.keys(), key=lambda k: last_name[k]))[0]] - 1

#write result
with open('name_male.txt', 'w') as f:
    for n in male_first_names:
        f.write(n + ',' + str(first_name['Male'][n] - male_offset) + '\n')
    f.close()

with open('name_female.txt', 'w') as f:
    for n in female_first_names:
        f.write(n + ',' + str(first_name['Female'][n] - female_offset) + '\n')
    f.close()

with open('name_all.txt', 'w') as f:
    for n in all_first_names:
        f.write(n + ',' + str(first_name['All'][n] - all_first_names_offset) + '\n')
    f.close()

with open('surname.txt', 'w') as f:
    for n in surnames:
        f.write(n + ',' + str(last_name[n] - surnames_offset) + '\n')
    f.close()
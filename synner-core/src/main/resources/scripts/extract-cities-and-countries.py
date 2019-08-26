# example
# python3 extract-cities-and-countries.py data.csv data2.csv data3.csv ...
# files are saved on the working dir

import csv
import sys
import random

countries = { }
cities_frequency = {}
countries_frequency = {}

#read
for i in range(1,len(sys.argv)):
    src = sys.argv[i]
    isFirstRow = True
    for row in csv.reader(open(src)):
        if isFirstRow:
            isFirstRow = False
            continue

        city = row[0]
        country = row[1]

        if country not in countries_frequency:
            countries_frequency[country] = 1
        else:
            countries_frequency[country] += 1

        if city not in cities_frequency:
            cities_frequency[city] = 1
        else:
            cities_frequency[city] += 1

        if country not in countries:
            countries[country] = []
        if city not in countries[country]:
            countries[country].append(city)

#write result
with open('countries-cities.csv', 'w') as f:
    f.write('country,city\n')
    for country in countries.keys():
        for city in countries[country]:
            f.write(country + ',' + city + '\n')
    f.close()

with open('cities.csv', 'w') as f:
    f.write('city,freq\n')
    for city in cities_frequency.keys():
        f.write(city + ',' + str(cities_frequency[city]) + '\n')
    f.close()

with open('countries.csv', 'w') as f:
    f.write('country,freq\n')
    for country in countries_frequency.keys():
        f.write(country + ',' + str(countries_frequency[country]) + '\n')
    f.close()
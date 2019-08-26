countries_continents = open('../countries-continents.csv', 'r')
cities_countries = open('../cities-countries.csv', 'r')

cities_all = open('../domains/cities/all.txt', 'w')
countries_all = open('../domains/countries/all.txt', 'w')
continents_all = open('../domains/continents/all.txt', 'w')

countries_dict = {}
cities_dict = {}
cities_array = []
cities_countries_array = []
countries_array = []
continents_array = []

for line in cities_countries:
    a = line.split(',')
    if a[1] not in cities_array:
        cities_array.append(a[1])
    if a[0] not in cities_countries_array:
        cities_countries_array.append(a[0])
    if a[0] not in cities_dict.keys():
        cities_dict[a[0]] = []
    cities_dict[a[0]].append(a[1])

for line in countries_continents:
    a = line.split(',')
    if a[1] not in countries_array:
        countries_array.append(a[1])
    if a[0] not in continents_array:
        continents_array.append(a[0])
    if a[0] not in countries_dict.keys():
        countries_dict[a[0]] = []
    countries_dict[a[0]].append(a[1])

for i in sorted(cities_array):
    cities_all.write(i.replace('"', "").replace('\n', "") + '\n')

for i in sorted(countries_array):
    countries_all.write(i.replace('"', "").replace('\n', "") + '\n')

for i in sorted(continents_array):
    continents_all.write(i.replace('"', "").replace('\n', "") + '\n')

for i in countries_dict.keys():
    new_i = i.replace('"', "").replace('\n', "")
    file = open('../domains/countries/' + new_i.lower() + '.txt', 'w')
    for j in sorted(countries_dict[i]):
        file.write(j.replace('"', "").replace('\n', "") + '\n')
    file.close()

for i in cities_dict.keys():
    new_i = i.replace('"', "").replace('\n', "")
    file = open('../domains/cities/' + new_i.lower() + '.txt', 'w')
    for j in sorted(cities_dict[i]):
        file.write(j.replace('"', "").replace('\n', "") + '\n')
    file.close()

print(len(cities_countries_array) == len(countries_array))

cities_countries.close()
countries_continents.close()
cities_all.close()
countries_all.close()
continents_all.close()

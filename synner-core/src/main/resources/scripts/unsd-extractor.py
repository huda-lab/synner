continents_list = {}
regions_list = {}
countries_list = {}
cities_list = {}

continents_regions_dict = {}
regions_countries_dict = {}
countries_cities_dict = {}

cities_countries_country_list = []
cities_countries_city_list = []
cities_countries = open('countries-cities.csv', 'r')
firstLine = True
for line in cities_countries:
    if firstLine:
        firstLine = False
        continue
    a = line.split(',')

    country = a[0].replace('\n', '')
    city = a[1].replace('\n', '')

    # for filtering countries that we don't have cities for
    if city not in cities_countries_city_list:
        cities_countries_city_list.append(city)
    if country not in cities_countries_country_list:
        cities_countries_country_list.append(country)

    if country not in countries_cities_dict:
        countries_cities_dict[country] = []
    if city not in countries_cities_dict[country]:
        countries_cities_dict[country].append(city)

    if city not in cities_list:
        cities_list[city] = 0
    cities_list[city] += 1


cities_countries.close()

unsd = open('../UNSD.csv', 'r')
firstLine = True
for line in unsd:
    if firstLine:
        firstLine = False
        continue
    a = line.split(',')

    continent = a[3]
    region = a[5]
    country = a[8]

    # print ("continent: " + continent + " region: " + region + " country: " + country)

    if country not in cities_countries_country_list:
        print ("skipping country " + country + " because there are no city for that")
        continue

    if region not in regions_list:
        regions_list[region] = 0
    regions_list[region] += 1
    if continent not in continents_list:
        continents_list[continent] = 0
    continents_list[continent] += 1    
    if country not in countries_list:
        countries_list[country] = 0
    countries_list[country] += 1

    if continent not in continents_regions_dict:
        continents_regions_dict[continent] = []
    if region not in continents_regions_dict[continent]:
        continents_regions_dict[continent].append(region)

    if region not in regions_countries_dict:
        regions_countries_dict[region] = []
    if country not in regions_countries_dict[region]:
        regions_countries_dict[region].append(country)
unsd.close()

continents = open('../db_creation/continents.csv', 'w')
continents.write('continent,freq\n')
for continent in continents_list.keys():
    continents.write(continent + ',' + str(continents_list[continent]) + '\n')
continents.close()

regions = open('../db_creation/regions.csv', 'w')
regions.write('region,freq\n')
for region in regions_list.keys():
    regions.write(region + ',' + str(regions_list[region]) + '\n')
regions.close()

countries = open('../db_creation/countries.csv', 'w')
countries.write('country,freq\n')
for country in countries_list:
    countries.write(country + ',' + str(countries_list[country]) + '\n')
countries.close()

cities = open('../db_creation/cities.csv', 'w')
cities.write('city,freq\n')
for city in cities_list:
    cities.write(city + ',' + str(cities_list[city]) + '\n')
cities.close()

continents_regions = open('../db_creation/continents-regions.csv', 'w')
continents_regions.write('continent,region\n')
for continent in continents_regions_dict.keys():
    for region in continents_regions_dict[continent]:
        continents_regions.write(continent + ',' + region + '\n')        
continents_regions.close()

regions_countries = open('../db_creation/regions-countries.csv', 'w')
regions_countries.write('region,country\n')
for region in regions_countries_dict.keys():
    for country in regions_countries_dict[region]:
        regions_countries.write(region + ',' + country + '\n')        
regions_countries.close()

countries_cities = open('../db_creation/countries-cities.csv', 'w')
countries_cities.write('country,city\n')
for country in countries_cities_dict:
    for city in countries_cities_dict[country]:
        countries_cities.write(country + ',' + city + '\n')
countries_cities.close()



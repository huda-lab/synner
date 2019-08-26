import csv

states_by_abbreviation = {}
airports_by_state = {}

with open('../states.csv') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        states_by_abbreviation[row['Abbreviation']] = row['State']

with open('../usairports.csv') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        airport = row['CITY'] # + ' (' + row['IATA_CODE'] + ')'
        if row['STATE'] not in airports_by_state:
            airports_by_state[row['STATE']] = set()
            airports_by_state[row['STATE']].add(airport)
        else:
            airports_by_state[row['STATE']].add(airport)

for k in airports_by_state.keys():
    if k not in states_by_abbreviation: continue
    file = open('../domains/uscities/' + states_by_abbreviation[k].lower() + '.txt', 'w')
    for a in sorted(airports_by_state[k]):
        file.write(a.replace('"', "").replace('\n', "") + '\n')
    file.close()

file = open('../domains/uscities/all.txt', 'w')
for k in airports_by_state.keys():
    if k not in states_by_abbreviation: continue
    for a in sorted(airports_by_state[k]):
        file.write(a.replace('"', "").replace('\n', "") + '\n')
file.close()

file = open('../domains/usstates/all.txt', 'w')
for k in states_by_abbreviation.keys():
    file.write(states_by_abbreviation[k].replace('"', "").replace('\n', "") + '\n')
file.close()

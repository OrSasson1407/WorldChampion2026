"""
Generates an initial diplomacy matrix for src/game/data/countries.json using
real-world signals:
  - shared military/economic alliance membership (NATO, EU, Five Eyes, etc.)
  - shared regional bloc membership (ASEAN, GCC, Arab League, Mercosur, CIS, SCO, BRICS, Commonwealth)
  - broad regional proximity (same continent/region -> small baseline bonus)
  - curated list of real, well-known active rivalries / conflicts (override to negative)

Score scale: -100 (open war/hostility) .. 0 (no relation) .. 100 (closest allies)
Only non-zero relations are written (zero is already the code's default fallback).
"""
import json

with open('src/game/data/countries.json', 'r', encoding='utf-8') as f:
    countries = json.load(f)

ids = [c['id'] for c in countries]
id_set = set(ids)

# ---------------------------------------------------------------------------
# Regions (broad, for a small "we're neighbors" baseline bonus)
# ---------------------------------------------------------------------------
REGIONS = {
    'Africa': ['AGO','BDI','BEN','BFA','BWA','CAF','CIV','CMR','COD','COG','DJI','DZA','EGY','ERI',
               'ESH','ETH','GAB','GHA','GIN','GMB','GNB','GNQ','KEN','LBR','LBY','LSO','MAR','MDG',
               'MLI','MOZ','MRT','MWI','NAM','NER','NGA','RWA','SDN','SEN','SLE','SOM','SSD','SWZ',
               'TCD','TGO','TUN','TZA','UGA','ZAF','ZMB','ZWE'],
    'MiddleEast': ['ARE','BHR','IRN','IRQ','ISR','JOR','KWT','LBN','OMN','PSE','QAT','SAU','SYR','YEM'],
    'Asia': ['AFG','BGD','BTN','BRN','KHM','CHN','IDN','IND','JPN','KAZ','KGZ','KOR','LAO','LKA','MMR',
             'MNG','MYS','NPL','PAK','PHL','PRK','TWN','TJK','THA','TKM','TLS','UZB','VNM'],
    'Caucasus': ['ARM','AZE','GEO'],
    'Europe': ['ALB','AUT','BEL','BGR','BIH','BLR','CHE','CYP','CZE','DEU','DNK','ESP','EST','FIN',
               'FRA','GBR','GRC','HRV','HUN','IRL','ISL','ITA','LTU','LUX','LVA','MDA','MKD','MNE',
               'NLD','NOR','POL','PRT','ROU','RUS','SRB','SVK','SVN','SWE','UKR'],
    'NorthAmerica': ['BHS','BLZ','CAN','CRI','CUB','DOM','GTM','HND','HTI','JAM','MEX','NIC','PAN',
                      'PRI','SLV','TTO','USA','GRL'],
    'SouthAmerica': ['ARG','BOL','BRA','CHL','COL','ECU','GUY','PER','PRY','SUR','URY','VEN','FLK'],
    'Oceania': ['AUS','FJI','NCL','NZL','PNG','SLB','VUT','ATF'],
}
region_of: dict[str, str] = {}
for region, members in REGIONS.items():
    for m in members:
        region_of[m] = region

# ---------------------------------------------------------------------------
# Real alliances / blocs (as of ~2025), each with a "closeness" bonus applied
# to every pair of members within that bloc.
# ---------------------------------------------------------------------------
BLOCS = [
    # (name, bonus, members)
    ('Five Eyes',       55, ['USA','GBR','CAN','AUS','NZL']),
    ('NATO',             45, ['ALB','BEL','BGR','CAN','HRV','CZE','DNK','EST','FIN','FRA','DEU','GRC',
                               'HUN','ISL','ITA','LVA','LTU','LUX','MNE','NLD','MKD','NOR','POL','PRT',
                               'ROU','SVK','SVN','ESP','SWE','TUR','GBR','USA']),
    ('EU',               35, ['AUT','BEL','BGR','HRV','CYP','CZE','DNK','EST','FIN','FRA','DEU','GRC',
                               'HUN','IRL','ITA','LVA','LTU','LUX','NLD','POL','PRT','ROU','SVK','SVN',
                               'ESP','SWE']),
    ('ASEAN',            30, ['BRN','KHM','IDN','LAO','MYS','MMR','PHL','THA','VNM']),
    ('GCC',              35, ['SAU','ARE','KWT','QAT','OMN','BHR']),
    ('Arab League',      15, ['SAU','ARE','KWT','QAT','OMN','EGY','JOR','LBN','SYR','IRQ','LBY','TUN',
                               'DZA','MAR','SDN','SOM','DJI','YEM','PSE','MRT']),
    ('Mercosur',         25, ['BRA','ARG','PRY','URY']),
    ('Pacific Alliance', 20, ['MEX','COL','CHL','PER']),
    ('CIS/Russia-aligned', 25, ['RUS','BLR','ARM','KAZ','KGZ','TJK','UZB']),
    ('SCO',              15, ['CHN','RUS','IND','PAK','KAZ','KGZ','TJK','UZB','IRN']),
    ('BRICS',            15, ['BRA','RUS','IND','CHN','ZAF','EGY','ETH','IRN','ARE']),
    ('Commonwealth',     12, ['GBR','CAN','AUS','NZL','IND','ZAF','NGA','KEN','GHA','PAK','BGD','MYS',
                               'TZA','UGA','ZMB','MWI','JAM','TTO','FJI','LSO','SWZ','BWA','NAM',
                               'CYP','MLT']),
]

REGION_BONUS = 10

# ---------------------------------------------------------------------------
# Curated real-world rivalries / active conflicts / hostile relations.
# These OVERRIDE the computed bloc/region score for that specific pair.
# ---------------------------------------------------------------------------
RIVALRIES = [
    ('RUS', 'UKR', -100),  # active war
    ('RUS', 'USA', -55),
    ('RUS', 'GBR', -50),
    ('RUS', 'DEU', -45),
    ('RUS', 'FRA', -45),
    ('RUS', 'POL', -60),
    ('RUS', 'EST', -60), ('RUS', 'LVA', -60), ('RUS', 'LTU', -60),
    ('RUS', 'GEO', -55),
    ('RUS', 'MDA', -40),
    ('IRN', 'USA', -75),
    ('IRN', 'ISR', -95),
    ('IRN', 'SAU', -40),
    ('PRK', 'USA', -85),
    ('PRK', 'KOR', -90),
    ('PRK', 'JPN', -70),
    ('IND', 'PAK', -80),
    ('IND', 'CHN', -30),
    ('CHN', 'TWN', -70),
    ('CHN', 'USA', -25),
    ('CHN', 'JPN', -20),
    ('ARM', 'AZE', -70),
    ('ISR', 'SYR', -70),
    ('ISR', 'LBN', -55),
    ('ISR', 'PSE', -80),
    ('MAR', 'DZA', -50),
    ('MAR', 'ESH', -60),
    ('SAU', 'YEM', -35),
    ('ETH', 'ERI', -25),
    ('SDN', 'SSD', -30),
    ('USA', 'CUB', -35),
    ('USA', 'VEN', -50),
    ('USA', 'SYR', -45),
    ('GRC', 'TUR', -25),
    ('CYP', 'TUR', -40),
    ('QAT', 'SAU', -10),  # residual chill post-2017 blockade, since resolved
    ('SOM', 'ETH', -15),
]

# ---------------------------------------------------------------------------
# Build the score matrix
# ---------------------------------------------------------------------------
scores: dict[str, dict[str, int]] = {cid: {} for cid in ids}

def add(a, b, amount):
    scores[a][b] = scores[a].get(b, 0) + amount
    scores[b][a] = scores[b].get(a, 0) + amount

for a in ids:
    for b in ids:
        if a >= b:
            continue
        if region_of.get(a) and region_of.get(a) == region_of.get(b):
            add(a, b, REGION_BONUS)

for name, bonus, members in BLOCS:
    members = [m for m in members if m in id_set]
    for i in range(len(members)):
        for j in range(i + 1, len(members)):
            add(members[i], members[j], bonus)

for a, b, value in RIVALRIES:
    if a not in id_set or b not in id_set:
        continue
    scores[a][b] = value
    scores[b][a] = value

for cid in ids:
    for other in list(scores[cid].keys()):
        v = scores[cid][other]
        v = max(-100, min(100, v))
        if v == 0:
            del scores[cid][other]
        else:
            scores[cid][other] = v

# ---------------------------------------------------------------------------
# Write back into countries.json
# ---------------------------------------------------------------------------
for c in countries:
    c['diplomacy'] = dict(sorted(scores[c['id']].items()))

with open('src/game/data/countries.json', 'w', encoding='utf-8') as f:
    json.dump(countries, f, indent=2, ensure_ascii=False)
    f.write('\n')

total_relations = sum(len(v) for v in scores.values())
print(f"Wrote diplomacy for {len(countries)} countries, {total_relations} directed relations total.")

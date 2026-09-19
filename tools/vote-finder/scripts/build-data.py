#!/usr/bin/env python3
"""Convert the Maricopa County "Voting Sites Schedule" XLSX into data/sites.json.

Usage:
    python3 scripts/build-data.py "~/Downloads/2026 General Election Voting Sites Schedule.xlsx"

Geocodes each address with the Census batch geocoder, falls back to Nominatim,
and caches results in data/geocode-cache.json so re-runs are instant. Sites that
neither geocoder can place must be added to MANUAL_COORDS below.

Requires: openpyxl (pip install openpyxl).
"""
import csv
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
CACHE_PATH = ROOT / 'data' / 'geocode-cache.json'
OUT_PATH = ROOT / 'public' / 'data' / 'sites.json'

# Addresses no geocoder resolves. Approximate, hand-placed.
MANUAL_COORDS = {
    '1 KAKA VILLAGE CIR, AJO, AZ 85321': (32.7186, -112.4325),
    '16402 N FORT MCDOWELL RD, SCOTTSDALE, AZ 85264': (33.6166, -111.6766),
}
SECTION_KINDS = {
    'Vote Center Locations': 'vote-center',
    'Drop Box Locations': 'dropbox',
    '24 Hour Drop Box Locations': 'dropbox-24h',
}
FIRST_DATA_COL = 13  # column M: first date column
NAME_COL, ADDR_COL, START_COL = 2, 10, 12
HOUR_RE = re.compile(r'^(\d{1,2}):(\d{2})([AP])-(\d{1,2}):(\d{2})([AP])$')
ADDR_RE = re.compile(r'^(.*?),\s*([A-Z .\-]+?),\s*AZ\s*(\d{5})')
UPPER_WORDS = {'asu', 'ymca', 'lds', 'usd', 'esd', 'hs', 'mctec', 'ii', 'iii'}
SMALL_WORDS = {'of', 'and', 'the', 'at', 'on', 'in'}


def expanded_row(ws, merges, r):
    """Cell values for row r with merged ranges filled from their top-left cell."""
    vals = {c: ws.cell(row=r, column=c).value for c in range(1, ws.max_column + 1)}
    for m in merges:
        if m.min_row <= r <= m.max_row:
            top_left = ws.cell(row=m.min_row, column=m.min_col).value
            for c in range(m.min_col, m.max_col + 1):
                if vals[c] is None:
                    vals[c] = top_left
    return vals


def find_header_row(ws):
    for r in range(1, 15):
        if ws.cell(row=r, column=NAME_COL).value == 'Facility Name':
            return r
    raise SystemExit('Could not find the "Facility Name" header row')


def date_spans(ws, merges, header_row):
    """Return [(date, first_col, last_col)] covering every column after the start-date column."""
    hdr = expanded_row(ws, merges, header_row)
    dates = []
    for c in range(FIRST_DATA_COL, ws.max_column + 1):
        v = hdr[c]
        if isinstance(v, str) and re.match(r'\d+/\d+/\d{4}', v):
            if dates and dates[-1][0] == v:
                dates[-1][1].append(c)
            else:
                dates.append((v, [c]))
    spans, prev_end = [], FIRST_DATA_COL - 1
    for d, cols in dates:
        spans.append((d, prev_end + 1, cols[-1]))
        prev_end = cols[-1]
    last = spans[-1]
    spans[-1] = (last[0], last[1], ws.max_column)
    return spans


def parse_sheet(path):
    wb = openpyxl.load_workbook(path)
    ws = wb.worksheets[0]
    merges = list(ws.merged_cells.ranges)
    header_row = find_header_row(ws)
    spans = date_spans(ws, merges, header_row)
    rows, kind = [], None
    for r in range(header_row + 1, ws.max_row + 1):
        v = expanded_row(ws, merges, r)
        name, addr = v[NAME_COL], v[ADDR_COL]
        section = next((k for prefix, k in SECTION_KINDS.items()
                        if isinstance(name, str) and name.startswith(prefix)), None)
        if section:
            kind = section
            continue
        if not name or not addr or kind is None:
            continue
        hours = []
        for d, a, b in spans:
            cands = {v[c] for c in range(a, b + 1) if v[c] not in (None, '')}
            if len(cands) > 1:
                raise SystemExit(f'Ambiguous cell at row {r} for {d}: {cands}')
            hours.append(next(iter(cands)) if cands else None)
        rows.append(dict(row=r, kind=kind, name=str(name).strip(), address=str(addr).strip(),
                         start=str(v[START_COL]).strip() if v[START_COL] else None, hours=hours))
    return [d for d, _, _ in spans], rows


def normalize_hours(raw):
    if raw is None:
        return 'closed'
    s = raw.strip().upper()
    if s == 'CLOSED':
        return 'closed'
    if s == '24 HOURS':
        return '24h'
    if s.startswith('DROP BOX ONLY'):
        return 'dropbox-only'
    if s.startswith('VOTE CENTER'):
        return 'vote-center'
    m = HOUR_RE.match(s)
    if not m:
        raise SystemExit(f'Unrecognized hours string: {raw!r}')

    def minutes(h, mi, ap):
        return (int(h) % 12 + (12 if ap == 'P' else 0)) * 60 + int(mi)

    start, end = minutes(*m.group(1, 2, 3)), minutes(*m.group(4, 5, 6))
    if end <= start:  # source typos such as "8:00A-4:00A": assume a PM close
        end = minutes(m.group(4), m.group(5), 'P')
    return [start, end]


def title_case(name):
    if '/' in name:
        return '/'.join(title_case(part) for part in name.split('/'))
    words = []
    for w in name.lower().split():
        core = re.sub(r'[^a-z]', '', w)
        if core in UPPER_WORDS or re.fullmatch(r'(?:[a-z]\.)+[a-z]?\.?', w):
            words.append(w.upper())
        elif core in SMALL_WORDS and words:
            words.append(w)
        else:
            words.append(re.sub(r"(^|[\s(/-])([a-z])", lambda m: m.group(1) + m.group(2).upper(), w))
    return ' '.join(words)


def census_batch(addresses):
    buf = io.StringIO()
    w = csv.writer(buf)
    for i, a in enumerate(addresses):
        m = ADDR_RE.match(a)
        if m:
            w.writerow([i, m.group(1), m.group(2), 'AZ', m.group(3)])
    boundary = 'geo-boundary-1234'
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="addressFile"; filename="a.csv"\r\n'
            f'Content-Type: text/csv\r\n\r\n{buf.getvalue()}\r\n--{boundary}\r\n'
            f'Content-Disposition: form-data; name="benchmark"\r\n\r\nPublic_AR_Current\r\n--{boundary}--\r\n')
    req = urllib.request.Request('https://geocoding.geo.census.gov/geocoder/locations/addressbatch',
                                 data=body.encode(), headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
    out = {}
    with urllib.request.urlopen(req, timeout=300) as resp:
        for rec in csv.reader(io.StringIO(resp.read().decode())):
            if len(rec) > 5 and rec[2] == 'Match':
                lng, lat = map(float, rec[5].split(','))
                out[addresses[int(rec[0])]] = [round(lat, 6), round(lng, 6), 'census']
    return out


def nominatim(address):
    q = urllib.parse.urlencode({'q': address, 'format': 'json', 'limit': 1, 'countrycodes': 'us'})
    req = urllib.request.Request('https://nominatim.openstreetmap.org/search?' + q,
                                 headers={'User-Agent': 'az-civic-tools vote-finder build script'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        d = json.load(resp)
    time.sleep(1.1)
    return [round(float(d[0]['lat']), 6), round(float(d[0]['lon']), 6), 'nominatim'] if d else None


def geocode_all(addresses):
    cache = json.loads(CACHE_PATH.read_text()) if CACHE_PATH.exists() else {}
    missing = sorted({a for a in addresses if a not in cache})
    if missing:
        print(f'Geocoding {len(missing)} new addresses via Census...')
        cache = {**cache, **census_batch(missing)}
    for a in sorted({a for a in addresses if a not in cache}):
        if a in MANUAL_COORDS:
            cache = {**cache, a: [*MANUAL_COORDS[a], 'manual']}
            continue
        hit = nominatim(a)
        print('  nominatim', 'OK  ' if hit else 'MISS', a)
        if hit:
            cache = {**cache, a: hit}
    CACHE_PATH.write_text(json.dumps(cache, indent=0, sort_keys=True))
    unresolved = [a for a in addresses if a not in cache]
    if unresolved:
        raise SystemExit('Unresolved addresses (add to MANUAL_COORDS):\n  ' + '\n  '.join(unresolved))
    return cache


def merge_site_rows(rows, legend):
    """One record per address. Vote centers that double as drop boxes appear twice in the
    sheet; merge them so `vc` holds in-person hours and `db` holds drop box hours."""
    idx = {}

    def code(h):
        k = json.dumps(h)
        if k not in idx:
            idx[k] = len(legend)
            legend.append(h)
        return idx[k]

    by_addr = defaultdict(list)
    for r in rows:
        by_addr[r['address']].append(r)
    out = []
    for addr, group in by_addr.items():
        vcs = [r for r in group if r['kind'] == 'vote-center']
        dbs = [r for r in group if r['kind'] != 'vote-center']
        if vcs and dbs:
            vc, db = vcs[0], dbs[0]
            vch = ['closed' if h == 'dropbox-only' else h for h in vc['hours']]
            dbh = [vh if vh not in ('closed', 'dropbox-only') else dh for vh, dh in zip(vc['hours'], db['hours'])]
            dbh = ['closed' if h == 'vote-center' else h for h in dbh]
            out.append({**vc, 'kind': 'vote-center', 'vc': [code(h) for h in vch], 'db': [code(h) for h in dbh]})
        else:
            for r in group:
                if r['kind'] == 'vote-center':
                    out.append({**r, 'vc': [code(h) for h in r['hours']]})
                else:
                    out.append({**r, 'vc': None, 'db': [code(h) for h in r['hours']]})
    return out


def build(xlsx_path):
    dates, rows = parse_sheet(xlsx_path)
    rows = [{**r, 'hours': [normalize_hours(h) for h in r['hours']]} for r in rows]
    coords = geocode_all([r['address'] for r in rows])
    legend = []
    merged = merge_site_rows(rows, legend)
    sites = []
    for r in merged:
        m = ADDR_RE.match(r['address'])
        lat, lng, src = coords[r['address']]
        site = {
            'id': r['row'], 'kind': r['kind'],
            'name': title_case(r['name'].replace('*', '').strip()),
            'street': title_case(m.group(1)), 'city': title_case(m.group(2)), 'zip': m.group(3),
            'lat': lat, 'lng': lng,
            'nonElectioneering': '**' in r['name'],
            'vc': r['vc'],
        }
        if 'db' in r and r['db'] != r['vc']:
            site['db'] = r['db']
        if src == 'manual':
            site['approx'] = True
        sites.append(site)
    sites.sort(key=lambda s: s['name'])
    payload = {'dates': dates, 'legend': legend, 'sites': sites}
    OUT_PATH.write_text(json.dumps(payload, separators=(',', ':')))
    print(f'Wrote {len(sites)} sites, {len(dates)} dates, {OUT_PATH.stat().st_size} bytes -> {OUT_PATH}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    build(Path(sys.argv[1]).expanduser())

#!/usr/bin/env python3
"""
sync_air_quality.py

Runs on a schedule (see .github/workflows/sync.yml) and makes sure every
station in Supabase's `air_quality_stations` table has complete, gap-free
hourly readings in `air_quality_readings`, right up to the present hour.

Strategy (deliberately simple, so it self-heals instead of needing perfect
gap math): every run re-pulls the full WINDOW (default 30 days) for every
known station/component from opendata.kosava.cloud and upserts all of it.
Upserting on (station_id, recorded_at) means:
  - any hour that was missing gets filled in
  - any hour that already existed is just overwritten with the same value
    (or corrected, if the upstream value changed)
  - running it every hour means no gap can ever be older than one run

This trades a bit of redundant network/DB traffic for a MUCH simpler,
harder-to-get-wrong correctness story than tracking exact missing hours.

Requires these environment variables (see workflow file for how they're
wired from GitHub Actions secrets):
  SUPABASE_URL              e.g. https://fnkqmwweljsupbmerbkh.supabase.co
  SUPABASE_SERVICE_ROLE_KEY service_role key (NOT the anon key — anon is
                             read-only under RLS and can't write rows)
  KOSAVA_BASE_URL           defaults to https://opendata.kosava.cloud
  WINDOW                    defaults to "30d" (whatever the API accepts)

ASSUMPTIONS THAT NEED CONFIRMING AGAINST THE REAL API (marked TODO below):
  1. Whether there's a componentless endpoint that returns the SEPA
     category (DOBAR/UMEREN/...) directly per hour. The frontend comment
     says "SEPA's own AQI category ... is what the API returns", implying
     it should be available somewhere — this script tries a couple of
     likely endpoint/field names and logs clearly if it can't find it,
     rather than guessing at category thresholds ourselves. Getting the
     official category slightly wrong is worse than leaving it NULL for
     now — please paste back the raw JSON this script logs so I can wire
     the real field name in.
  2. Whether there's a "list all stations" endpoint. This script does NOT
     assume one exists — it only syncs stations that already exist in
     your Supabase `air_quality_stations` table, and separately attempts
     (best-effort, non-fatal) an auto-discovery call in case the API does
     expose a list.
"""

import os
import sys
import json
from datetime import datetime, timezone

import requests

KOSAVA_BASE_URL = os.environ.get("KOSAVA_BASE_URL", "https://opendata.kosava.cloud")
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
WINDOW = os.environ.get("WINDOW", "30d")

SB_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

# Known category labels (from the frontend's AQI_COLORS map) so we can
# recognize a categorical series if one shows up in the API response
# instead of guessing at thresholds ourselves.
KNOWN_CATEGORIES = {
    "DOBAR", "PRIHVATLJIV", "UMEREN", "ZAGAĐEN", "VEOMA ZAGAĐEN", "IZUZETNO ZAGAĐEN",
}

# Normalizes whatever short_name the API uses to our DB column names.
# TODO: confirm these are the exact short_name strings the API returns —
# adjust the keys (left side) if the real payload differs.
COMPONENT_COLUMN_MAP = {
    "PM10": "pm10",
    "PM2.5": "pm25",
    "PM2,5": "pm25",
    "PM25": "pm25",
    "SO2": "so2",
    "NO2": "no2",
    "O3": "o3",
}


def log(msg):
    print(f"[{datetime.now(timezone.utc).isoformat()}] {msg}", flush=True)


def get_organization_id():
    resp = requests.get(f"{KOSAVA_BASE_URL}/organizations", timeout=30)
    resp.raise_for_status()
    orgs = resp.json()
    if not orgs:
        raise RuntimeError("No organizations returned from kosava API")
    return orgs[0]["organization_id"]


def get_known_stations():
    """Stations already registered in Supabase — the source of truth for
    'which stations exist', since the frontend already reads from this table."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/air_quality_stations",
        headers=SB_HEADERS,
        params={"select": "id,name,lat,lon"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def try_discover_new_stations(organization_id, known_ids):
    """Best-effort: some APIs expose a plain list-of-stations endpoint.
    Non-fatal if it doesn't exist — we just log and move on."""
    url = f"{KOSAVA_BASE_URL}/{organization_id}/stations"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            log(f"Station auto-discovery: {url} -> {resp.status_code} (skipping, not fatal)")
            return
        stations = resp.json()
        new_rows = []
        for s in stations:
            sid = s.get("station_id") or s.get("id")
            if sid is None or sid in known_ids:
                continue
            if "lat" not in s or "lon" not in s:
                log(f"  station {sid} missing lat/lon in discovery payload, skipping auto-register — add it manually")
                continue
            new_rows.append({
                "id": sid,
                "name": s.get("station_name") or s.get("name") or f"station_{sid}",
                "lat": s["lat"],
                "lon": s["lon"],
            })
        if new_rows:
            upsert("air_quality_stations", new_rows, on_conflict="id")
            log(f"Auto-registered {len(new_rows)} new station(s): {[r['id'] for r in new_rows]}")
    except requests.RequestException as e:
        log(f"Station auto-discovery failed (non-fatal): {e}")


def fetch_station_components(organization_id, station_id):
    resp = requests.get(f"{KOSAVA_BASE_URL}/{organization_id}/stations/{station_id}/meta", timeout=30)
    if resp.status_code != 200:
        log(f"  station {station_id}: meta fetch failed {resp.status_code} {resp.text[:200]}")
        return []
    return resp.json().get("public_components", [])


def fetch_component_points(organization_id, station_id, component_id):
    resp = requests.get(
        f"{KOSAVA_BASE_URL}/measurements",
        params={
            "organization_id": organization_id,
            "station_id": station_id,
            "component_id": component_id,
            "window": WINDOW,
        },
        timeout=30,
    )
    if resp.status_code != 200:
        log(f"    component {component_id}: fetch failed {resp.status_code} {resp.text[:200]}")
        return []
    return resp.json().get("points", [])


def try_fetch_category_series(organization_id, station_id):
    """Best-effort attempt at a dedicated category/index endpoint.
    TODO: replace these guessed paths once you confirm the real one from
    the logged 404s / raw payloads."""
    for path in (f"stations/{station_id}/index", f"stations/{station_id}/category", f"stations/{station_id}/aqi"):
        url = f"{KOSAVA_BASE_URL}/{organization_id}/{path}"
        try:
            resp = requests.get(url, params={"window": WINDOW}, timeout=15)
        except requests.RequestException:
            continue
        if resp.status_code == 200:
            data = resp.json()
            points = data.get("points", data if isinstance(data, list) else [])
            if points:
                log(f"  station {station_id}: found category series at {url}")
                return points
    return None


def normalize_timestamp(point):
    if "date" in point and "time" in point:
        return f"{point['date']}T{point['time']}"
    if "timestamp" in point:
        return point["timestamp"]
    return None


def upsert(table, rows, on_conflict):
    if not rows:
        return
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers={**SB_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
        params={"on_conflict": on_conflict},
        data=json.dumps(rows),
        timeout=60,
    )
    if resp.status_code >= 300:
        log(f"  UPSERT FAILED into {table}: {resp.status_code} {resp.text[:500]}")
        resp.raise_for_status()


def sync_station(organization_id, station):
    station_id = station["id"]
    log(f"Station {station_id} ({station.get('name')}): syncing window={WINDOW}")

    components = fetch_station_components(organization_id, station_id)
    if not components:
        log(f"  no public components — skipping")
        return

    by_timestamp = {}  # ts -> row dict

    for comp in components:
        comp_id = comp["component_id"]
        raw_name = comp.get("short_name") or str(comp_id)
        column = COMPONENT_COLUMN_MAP.get(raw_name.upper().replace(",", "."))
        if not column:
            log(f"  component '{raw_name}' not in COMPONENT_COLUMN_MAP — skipping "
                f"(add a mapping if this is a real pollutant)")
            continue

        points = fetch_component_points(organization_id, station_id, comp_id)
        log(f"  {raw_name} -> {column}: {len(points)} points")

        for p in points:
            ts = normalize_timestamp(p)
            if ts is None:
                continue
            value = p.get("value")
            row = by_timestamp.setdefault(ts, {"station_id": station_id, "recorded_at": ts})

            # Some component "values" might actually be categorical strings
            # rather than numeric pollutant readings — catch that instead of
            # silently writing a string into a numeric column.
            if isinstance(value, str) and value.strip().upper() in KNOWN_CATEGORIES:
                row["category"] = value.strip().upper()
            else:
                row[column] = value

    # Best-effort dedicated category endpoint, merged in on top of anything
    # found above (only if we don't already have a category for that hour).
    category_points = try_fetch_category_series(organization_id, station_id)
    if category_points:
        for p in category_points:
            ts = normalize_timestamp(p)
            if ts is None or ts not in by_timestamp:
                continue
            if "category" not in by_timestamp[ts] and p.get("value"):
                by_timestamp[ts]["category"] = p["value"]

    rows = list(by_timestamp.values())
    if not rows:
        log(f"  nothing to upsert")
        return

    missing_category = sum(1 for r in rows if "category" not in r)
    if missing_category:
        log(f"  WARNING: {missing_category}/{len(rows)} hours have no category — "
            f"see module docstring TODO #1, left as NULL rather than guessed")

    upsert("air_quality_readings", rows, on_conflict="station_id,recorded_at")
    log(f"  upserted {len(rows)} hourly rows")


def main():
    organization_id = get_organization_id()
    log(f"Organization: {organization_id}")

    stations = get_known_stations()
    log(f"Known stations in Supabase: {[s['id'] for s in stations]}")

    try_discover_new_stations(organization_id, {s["id"] for s in stations})
    stations = get_known_stations()  # re-read in case new ones got added

    failures = []
    for station in stations:
        try:
            sync_station(organization_id, station)
        except Exception as e:
            log(f"Station {station['id']} FAILED: {e}")
            failures.append(station["id"])

    if failures:
        log(f"Completed with failures on stations: {failures}")
        sys.exit(1)
    log("All stations synced successfully")


if __name__ == "__main__":
    main()

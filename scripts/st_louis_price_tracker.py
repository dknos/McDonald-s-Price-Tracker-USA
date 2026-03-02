#!/usr/bin/env python3
import argparse
import csv
import json
import math
from pathlib import Path
from typing import Dict, Iterable, List, Tuple
from urllib.parse import urlencode
from urllib.request import Request, urlopen

EARTH_RADIUS_MI = 3958.7613


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_MI * math.asin(math.sqrt(a))


def read_json(path: Path) -> Dict:
    return json.loads(path.read_text())


def get_json(url: str, timeout: int = 20) -> Dict:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def circle_sampling_points(center_lat: float, center_lng: float, radius_miles: float, step_miles: float) -> List[Tuple[float, float]]:
    lat_delta_per_mile = 1 / 69.0
    lng_delta_per_mile = 1 / (69.172 * math.cos(math.radians(center_lat)))

    lat_min = center_lat - radius_miles * lat_delta_per_mile
    lat_max = center_lat + radius_miles * lat_delta_per_mile
    lng_min = center_lng - radius_miles * lng_delta_per_mile
    lng_max = center_lng + radius_miles * lng_delta_per_mile

    lat_step = step_miles * lat_delta_per_mile
    lng_step = step_miles * lng_delta_per_mile

    points: List[Tuple[float, float]] = []
    lat = lat_min
    while lat <= lat_max + 1e-9:
        lng = lng_min
        while lng <= lng_max + 1e-9:
            if haversine_miles(center_lat, center_lng, lat, lng) <= radius_miles:
                points.append((round(lat, 5), round(lng, 5)))
            lng += lng_step
        lat += lat_step
    points.append((center_lat, center_lng))
    return points


def extract_stores(payload: Dict) -> Iterable[Dict]:
    if isinstance(payload, dict):
        if "features" in payload and isinstance(payload["features"], list):
            for f in payload["features"]:
                p = f.get("properties", {})
                g = f.get("geometry", {})
                coords = g.get("coordinates") or [None, None]
                yield {
                    "store_id": str(p.get("storeId") or p.get("id") or ""),
                    "name": p.get("title") or p.get("name") or "",
                    "address": p.get("addressLine1") or p.get("address") or "",
                    "city": p.get("city") or "",
                    "state": p.get("state") or "",
                    "postal_code": p.get("postcode") or p.get("zip") or "",
                    "lat": coords[1],
                    "lng": coords[0]
                }
        elif "restaurants" in payload and isinstance(payload["restaurants"], list):
            for r in payload["restaurants"]:
                yield {
                    "store_id": str(r.get("storeId") or r.get("id") or ""),
                    "name": r.get("name") or "",
                    "address": r.get("address") or "",
                    "city": r.get("city") or "",
                    "state": r.get("state") or "",
                    "postal_code": r.get("postalCode") or "",
                    "lat": r.get("latitude"),
                    "lng": r.get("longitude")
                }


def flatten_price_rows(store: Dict, payload: Dict) -> Iterable[Dict]:
    if not isinstance(payload, dict):
        return
    candidates = []
    if isinstance(payload.get("items"), list):
        candidates = payload["items"]
    elif isinstance(payload.get("products"), list):
        candidates = payload["products"]

    for item in candidates:
        price_obj = item.get("price") if isinstance(item, dict) else None
        amount = None
        currency = "USD"
        if isinstance(price_obj, dict):
            amount = price_obj.get("value") or price_obj.get("amount")
            currency = price_obj.get("currency") or currency
        if amount is None and isinstance(item, dict):
            amount = item.get("price")

        yield {
            "store_id": store["store_id"],
            "store_name": store["name"],
            "city": store["city"],
            "state": store["state"],
            "product_id": item.get("id") if isinstance(item, dict) else None,
            "product_name": item.get("name") if isinstance(item, dict) else None,
            "price": amount,
            "currency": currency
        }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--outdir", default="data")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    cfg = read_json(Path(args.config))
    center = cfg["center"]
    radius = float(cfg["radius_miles"])
    step = float(cfg.get("sampling_step_miles", 15))
    timeout = int(cfg.get("request_timeout_seconds", 20))
    points = circle_sampling_points(center["lat"], center["lng"], radius, step)

    print(f"Region: {cfg['region_name']}")
    print(f"Center: {center['name']} ({center['lat']}, {center['lng']})")
    print(f"Radius miles: {radius}")
    print(f"Sampling points: {len(points)}")

    if args.dry_run:
        return

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    stores_by_id: Dict[str, Dict] = {}
    for lat, lng in points:
        params = {
            "latitude": lat,
            "longitude": lng,
            "country": cfg.get("country", "us"),
            "language": cfg.get("language", "en-us")
        }
        params.update(cfg.get("store_search_params", {}))
        url = f"{cfg['store_search_url']}?{urlencode(params)}"
        try:
            payload = get_json(url, timeout=timeout)
        except Exception as e:
            print(f"WARN store-search failed at ({lat},{lng}): {e}")
            continue

        for s in extract_stores(payload):
            sid = s.get("store_id", "").strip()
            if sid:
                stores_by_id[sid] = s

    stores = list(stores_by_id.values())
    (outdir / "stores_raw.json").write_text(json.dumps(stores, indent=2))
    print(f"Discovered stores: {len(stores)}")

    menu_template = cfg["store_menu_url_template"]
    price_payloads: List[Dict] = []
    rows: List[Dict] = []

    for s in stores:
        url = menu_template.format(store_id=s["store_id"])
        try:
            payload = get_json(url, timeout=timeout)
            price_payloads.append({"store_id": s["store_id"], "payload": payload})
            rows.extend(list(flatten_price_rows(s, payload)))
        except Exception as e:
            print(f"WARN menu-fetch failed for store {s['store_id']}: {e}")

    (outdir / "store_prices_raw.json").write_text(json.dumps(price_payloads, indent=2))

    csv_path = outdir / "st_louis_prices.csv"
    headers = ["store_id", "store_name", "city", "state", "product_id", "product_name", "price", "currency"]
    with csv_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote rows: {len(rows)}")
    print(f"CSV: {csv_path}")


if __name__ == "__main__":
    main()

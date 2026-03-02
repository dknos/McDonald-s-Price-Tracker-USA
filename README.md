# McDonald's Price Tracker (Greater St. Louis)

This repository contains a **St. Louis-focused configuration + data collection script** inspired by [CyrilSLi/mcdonalds-price-tracker](https://github.com/CyrilSLi/mcdonalds-price-tracker).

Because this environment cannot reach GitHub directly, this repo includes a practical reimplementation that follows the same high-level pattern:

1. discover stores in a target geography,
2. fetch store-level menu/offer payloads,
3. flatten to CSV for analysis.

## Target geography

- **Center:** St. Louis, MO (`38.6270, -90.1994`)
- **Radius:** `100 miles` (≈ `160.934 km`)

Configured in `config/st_louis_100mi.json`.

## Quick start

```bash
python3 scripts/st_louis_price_tracker.py \
  --config config/st_louis_100mi.json \
  --outdir data
```

Outputs:

- `data/stores_raw.json`
- `data/store_prices_raw.json`
- `data/st_louis_prices.csv`

## How it works

The script:

- Builds a latitude/longitude sampling grid covering the 100-mile circle.
- Calls McDonald's geosearch endpoint for each sample to discover nearby stores.
- De-duplicates stores by store id.
- Fetches each store's menu/price payload from a configurable endpoint template.
- Flattens nested data into CSV rows (`store_id`, `product_id`, `name`, `price`, etc.).

> Note: endpoint contracts can change. If McDonald's alters API paths/fields, adjust the endpoint templates and field extraction in `scripts/st_louis_price_tracker.py`.

## Endpoint configuration

The script keeps endpoints in config so you can quickly patch if APIs move.

Current defaults are set to common public patterns used by McDonald's web/app surfaces:

- `store_search_url`: `https://www.mcdonalds.com/googleappsv2/geolocation`
- `store_menu_url_template`: `https://www.mcdonalds.com/googleappsv2/menu?storeId={store_id}&country=us&language=en-us`

If your runtime inspection of upstream shows different endpoints, update them in `config/st_louis_100mi.json`.

## Validate radius logic only

```bash
python3 scripts/st_louis_price_tracker.py --config config/st_louis_100mi.json --dry-run
```

This performs no network calls and prints expected sample density.

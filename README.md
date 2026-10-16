# Trade Data Explorer

An English/Chinese data explorer for 20 economies, with a common comparison workspace. This is a descriptive data resource, not a classification of development paths or an estimate of causal effects.

**Website:** https://Astra-lele.github.io/trade-data-explorer/

## Coverage

Eight topics: trade and external balances; goods composition; HS product detail; trading partners; value, volume and prices; services and tourism; FDI and infrastructure; economy and sectors.

Countries: Ethiopia, Kenya, Malawi, Mozambique, Rwanda, Tanzania, Uganda, Benin, Burkina Faso, Cote d'Ivoire, Ghana, Guinea, Guinea-Bissau, Senegal, Sierra Leone, Togo, Vietnam, Bangladesh, Colombia and Peru.

The snapshot was assembled on 16 October 2026. Annual series mostly cover 2000-2024, with indicator-specific gaps. The stored BACI extract contains **2000, 2005, 2010, 2015, 2019 and 2023 only**. BiTS covers 2000-2023. The data are a fixed snapshot, not a live API feed.

The site includes 356 catalogued series, 112,510 country-year observations, and 5,005 observed HS6 product codes. Product baskets and partner series are computed on demand. Country, year, unit and view selections are retained in shareable URLs. CSV, PNG, SVG and prepared source tables can be downloaded.

## Interpretation

- Missing observations remain missing. Ranking's optional latest-available mode displays the actual year used.
- Shares use the stated country-year total, including unclassified goods, not just the categories visible on screen. Broad and narrow light-consumer baskets overlap and must not be added.
- Quantities in the product extract are tonnes. Physical quantities and unit values are offered only for a single HS6 code. A unit value is not a quality-adjusted price index.
- China-origin import value is available at product level. Other merchandise partners are available as totals, not as a complete product-by-partner matrix.
- National-accounts trade, customs merchandise and balance-of-payments services have different coverage. They are kept separate; their components are not forced to reconcile.
- BiTS totals use reported world totals where available and sums of available bilateral observations otherwise. Missing bilateral partners and incomplete service categories are flagged.
- Modelled and observed employment, WDI and UNSD manufacturing, and WDI and IMF current accounts remain separate series.
- Infrastructure series are private-participation investment commitments, not total infrastructure expenditure or infrastructure FDI. Cumulated FDI flows are not an FDI stock measure.
- Monetary values are current US dollars unless a series explicitly says otherwise. Dollar/GDP and per-capita transformations use the matching country's year-specific WDI denominator.

Every view links to source metadata and provides units. The Sources page lists prepared data tables, inventory, coverage, limitations and original provider links. The public inventory omits internal email attribution.

## Running Locally

No build is required. With Node.js installed:

```sh
npm run serve
```

Open the URL printed by the server. `npm test` checks data integrity and core transformations. Serve the repository root on GitHub Pages using the `main` branch and `/ (root)` folder. All assets are local and all paths are relative, so project Pages work without a custom domain.

## Files and Rebuilding

`src/` contains the interface and calculations; `data/` contains browser-ready tables, with product and bilateral-service data loaded by country; `downloads/` contains the prepared CSV snapshot; `vendor/` contains the pinned chart and icon libraries. `tests/` contains validation. `tools/` contains the local server and snapshot conversion scripts.

Rebuilding requires the separate source inventory folder `trade_development_master_20261016`, including its `code/config.py`, processed tables and reference classifications. This repository is self-contained for viewing, but does not duplicate the full upstream raw-data archive.

```sh
python -m pip install -r requirements.txt
python tools/build_data.py --source /path/to/trade_development_master_20261016
python tools/build_labels.py --source /path/to/trade_development_master_20261016
```

The scripts convert the prepared inventory into the website snapshot; they do not download or refresh upstream databases.

## Sources and Attribution

Data: World Bank WDI, CEPII BACI (HS92, V202601), WITS/UNCTAD classifications, IMF BiTS, ILOSTAT, UNSD National Accounts, IMF WEO (October 2026), and UN Tourism via Our World in Data. Source-specific metadata and limitations are retained in `data/catalog.json`. Data remain subject to their original providers' terms; inclusion here does not relicense them.

Frontend dependencies: Apache ECharts 5.6.0 (Apache-2.0) and Lucide 0.468.0 (ISC). Their license files are included in `vendor/`.

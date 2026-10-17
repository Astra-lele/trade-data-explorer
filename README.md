# Trade Data Explorer

An English-language data explorer for 20 economies, with a common comparison workspace. This is a descriptive data resource, not a classification of development paths or an estimate of causal effects. The public interface is English-only, including previously saved URLs and language preferences.

**Website:** https://Astra-lele.github.io/trade-data-explorer/

## Coverage

Eight topics: trade and external balances; goods composition; HS product detail; trading partners; value, volume and prices; services and tourism; FDI and infrastructure; economy and sectors.

Countries: Ethiopia, Kenya, Malawi, Mozambique, Rwanda, Tanzania, Uganda, Benin, Burkina Faso, Cote d'Ivoire, Ghana, Guinea, Guinea-Bissau, Senegal, Sierra Leone, Togo, Vietnam, Bangladesh, Colombia and Peru.

The snapshot was assembled on 16 October 2026. BACI goods detail, processing-stage and technology composition, broad light-consumer goods, and all recorded merchandise partners cover **every year 2000-2024 in all 20 countries**, for imports and exports. Partner data contain 149,043 records and all 1,000 country-year-flow groups. Other annual indicators have source-specific gaps; BiTS covers 2000-2023. This is a fixed snapshot, not a live API feed.

The site includes 353 catalogued series, 142,930 country-year observations, 5,011 observed HS6 codes, and 3,009,556 annual product-flow records. Product baskets and partner series are computed on demand. Country, year, unit and view selections are retained in shareable URLs. CSV, PNG, SVG and prepared source tables can be downloaded.

In **Product detail**, **Top products** ranks the top 5, 10, 20, 50 or 100 goods by country, reference year, flow and HS2/4/6 level. Selecting a ranked HS6 opens its annual **Value / quantity / unit value** panels; selecting HS2/4 opens its value trend. These panels are also available whenever the basket contains a single HS6. Their CSV includes all three quantities together. No physical quantities are aggregated across different HS6 products.

In **Goods composition**, choose **Light consumer baskets** for the broad basket's annual value, merchandise share, GDP share, per-person value, China-origin value and China share (the last two apply to imports). **Trading partners** provides annual bilateral trends, country comparisons, changes, partner composition and tables for both imports and exports. China shares and partner concentration (HHI) are annual indicators. These series and composition panels can be added to the comparison workspace alongside the other topics.

## Interpretation

- Missing observations remain missing. Ranking's optional latest-available mode displays the actual year used.
- Shares use the stated country-year total, including unclassified goods, not just categories visible on screen. Only the broad research-defined light-consumer basket is offered; original source downloads retain their historical classification flags for provenance.
- Quantities in the product extract are tonnes. Physical quantities and unit values are offered only for a single HS6 code. A unit value is not a quality-adjusted price index.
- China-origin import value is annual at product level. All merchandise partners are available as annual totals, not as a complete product-by-partner matrix. Partner totals reconcile with product totals. Historical territory definitions follow the source; display names use the latest name recorded for each partner code.
- National-accounts trade, customs merchandise and balance-of-payments services have different coverage. They are kept separate; their components are not forced to reconcile.
- BiTS totals use reported world totals where available and sums of available bilateral observations otherwise. Missing bilateral partners and incomplete service categories are flagged.
- Modelled and observed employment, WDI and UNSD manufacturing, and WDI and IMF current accounts remain separate series.
- Infrastructure series are private-participation investment commitments, not total infrastructure expenditure or infrastructure FDI. Cumulated FDI flows are not an FDI stock measure.
- Monetary values are current US dollars unless a series explicitly says otherwise. Dollar/GDP and per-capita transformations use the matching country's year-specific WDI denominator.

Every view links to source metadata and provides units. The Sources page lists prepared data tables, inventory, coverage, limitations and original provider links. The public inventory omits internal email attribution.

Annual downloads include the four supplied `.csv.gz` files (imports, exports, goods composition, partners), a public manifest with checksums (the local source path is removed), goods and partner coverage, broad-basket indicators, top-100 rankings and coverage notes. The annual manifest and coverage tables supersede the older inventory's BACI coverage. Non-goods source tables retain their own definitions and dates. Missing GDP or population denominators remain missing; they are not carried forward.

## Running Locally

No build is required. With Node.js installed:

```sh
npm run serve
```

Open the URL printed by the server. `npm test` checks data integrity and core transformations. Serve the repository root on GitHub Pages using the `main` branch and `/ (root)` folder. All assets are local and all paths are relative, so project Pages work without a custom domain.

## Files and Rebuilding

`src/` contains the English-only interface and calculations; `data/` contains browser-ready tables, with product, ranking and bilateral-service data loaded by country; `downloads/` contains the prepared snapshot; `vendor/` contains the pinned chart and icon libraries. Product and ranking shards and the partner table use gzip and the browser's standard `DecompressionStream` API (current Chrome, Edge, Firefox or Safari). `tests/` contains validation. `tools/build_goods.py` generates and reconciles the annual goods tables; `tools/build_data.py` builds the complete snapshot and validates partner coverage, shares, China totals and product totals. Source data are read-only inputs.

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

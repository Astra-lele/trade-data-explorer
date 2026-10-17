"""Annual goods snapshot and reproducible derived tables (HS92, BACI V202601)."""
import gzip
import hashlib
import json

import numpy as np
import pandas as pd


YEARS = list(range(2000, 2025))
FLOW_FILES = {f: f'baci_{f}_product_annual_2000_2024.csv.gz' for f in ['import', 'export']}
COMPOSITION_FILE = 'merchandise_composition_annual_2000_2024.csv.gz'
MANIFEST_FILE = 'baci_annual_2000_2024_master_manifest.json'
BROAD_NOTE = ('Research-defined broad light-consumer basket, not an official statistical category. '
              'WITS consumer goods in HS61, HS62, HS64 or HS6309, plus WITS consumer goods '
              'classified as low-technology manufactures excluding HS01-24,27,30,84,85,87. '
              'Shares use all recorded merchandise; China share uses the broad import basket. '
              'GDP and population denominators are same-country, same-year WDI observations; missing denominators remain missing.')


def build_goods(source, out, downloads, countries, gdp, pop, stages, technologies, add_series, write_json, rows):
    products, totals, composition, counts = {}, {}, [], {}
    ranking_frames, light_frames, coverage = [], [], []
    manifest = json.loads((source / MANIFEST_FILE).read_text(encoding='utf-8-sig'))
    assert manifest['years'] == YEARS and set(manifest['countries']) == set(countries)
    expected = pd.MultiIndex.from_product([sorted(countries), YEARS], names=['iso3', 'year'])
    downloads.mkdir(exist_ok=True)

    def gzip_json(path, data):
        raw = json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(gzip.compress(raw, compresslevel=6, mtime=0))

    for flow, filename in FLOW_FILES.items():
        df = pd.read_csv(source / filename, dtype={'hs6': str, 'hs2': str}, low_memory=False)
        df['hs6'] = df.hs6.str.zfill(6)
        assert not df.duplicated(['iso3', 'year', 'hs6']).any()
        assert df.hs6.str.fullmatch(r'\d{6}').all()
        df['value'] = df.value_thousand_usd * 1000
        df['china_value'] = df.china_v * 1000 if flow == 'import' else np.nan
        assert df.value.notna().all() and np.isfinite(df.value).all() and df.value.ge(0).all()
        assert df.quantity_tonnes.dropna().ge(0).all()
        if flow == 'import':
            assert df.china_value.notna().all() and df.china_value.ge(0).all()
            assert (df.china_value <= df.value + 1e-5).all()
        total = df.groupby(['iso3', 'year']).value.sum().sort_index()
        assert total.index.equals(expected), f'{flow}: missing or unexpected country-years'
        counts[flow + '_product_rows'] = len(df)
        counts[flow + '_country_years'] = len(total)
        for (iso, year), v in total.items():
            totals.setdefault(iso, {}).setdefault(flow, {})[str(year)] = float(v)
        for row in df[['hs6', 'description', 'stage', 'technology_group', 'broad_light_consumer']].drop_duplicates('hs6').itertuples(index=False, name=None):
            item = [row[1], row[2] if pd.notna(row[2]) else 'Unclassified',
                    row[3] if pd.notna(row[3]) else 'Other / unclassified', bool(row[4]) if pd.notna(row[4]) else False]
            assert row[0] not in products or products[row[0]] == item
            products[row[0]] = item
        for iso, frame in df.groupby('iso3'):
            frame = frame.sort_values(['year', 'hs6'])
            gzip_json(out / 'products' / f'{iso}-{flow}.json.gz', rows(frame[['year', 'hs6', 'value', 'quantity_tonnes', 'china_value']]))
        for (iso, year), frame in df.groupby(['iso3', 'year']):
            coverage.append({'iso3': iso, 'year': year, 'flow': flow, 'hs6_records': len(frame),
                             'value_usd': float(frame.value.sum()),
                             'positive_quantity_records': int(frame.quantity_tonnes.gt(0).sum()),
                             'gdp_available': bool(pd.notna(gdp.get((iso, year)))),
                             'population_available': bool(pd.notna(pop.get((iso, year))))})
        for classification, col, translation in [('stage', 'stage', stages), ('technology', 'technology_group', technologies)]:
            grouped = df.assign(category=df[col].fillna('Unclassified' if classification == 'stage' else 'Other / unclassified')).groupby(['iso3', 'year', 'category']).value.sum()
            assert set(grouped.index.get_level_values('category')) <= set(translation)
            index = pd.MultiIndex.from_tuples([(i, y, c) for i, y in total.index for c in translation], names=['iso3', 'year', 'category'])
            grouped = grouped.reindex(index, fill_value=0).reset_index()
            for r in grouped.itertuples(index=False):
                composition.append([r.iso3, int(r.year), flow, classification, r.category, float(r.value)])
            for cat, frame in grouped.groupby('category'):
                frame = frame.copy()
                keys = pd.MultiIndex.from_frame(frame[['iso3', 'year']])
                frame['share'] = frame.value.to_numpy() / total.reindex(keys).to_numpy() * 100
                frame['gdp'] = frame.value.to_numpy() / gdp.reindex(keys).to_numpy() * 100
                for measure, unit in [('value', 'USD'), ('share', f'% of merchandise {flow}s'), ('gdp', '% of GDP')]:
                    add_series(f'baci.{flow}.{classification}.{cat}.{measure}', f'{cat} {flow}s',
                               translation[cat] + ('进口' if flow == 'import' else '出口'), 'composition', unit, 'baci', frame, measure,
                               'Annual BACI HS92 with WITS classification. Share denominator includes unclassified merchandise. Zero category value means no recorded value within an observed country-year.')

        light = df[df.broad_light_consumer.eq(True)].groupby(['iso3', 'year'])[['value', 'china_value']].sum(min_count=1).reindex(total.index, fill_value=0)
        light['share'] = 100 * light.value / total
        light['gdp'] = 100 * light.value / gdp.reindex(total.index)
        light['percap'] = light.value / pop.reindex(total.index)
        if flow == 'import':
            light['china_share'] = 100 * light.china_value / light.value.where(light.value.gt(0))
            china = df.groupby(['iso3', 'year']).china_value.sum().reindex(total.index)
            for measure, values, unit in [('value', china, 'USD'), ('share', 100 * china / total, '% of merchandise imports')]:
                add_series(f'baci.import.china.{measure}', 'Merchandise imports from China', '中国来源商品进口', 'partners', unit,
                           'baci', values.rename('value').reset_index(), note='Annual sum of product-level china_v; share denominator is all recorded merchandise imports.')
        light = light.reset_index()
        measures = [('value', 'USD'), ('share', f'% of merchandise {flow}s'), ('gdp', '% of GDP'), ('percap', 'USD/person')]
        if flow == 'import':
            measures += [('china_value', 'USD'), ('china_share', '% of basket imports from China')]
        for measure, unit in measures:
            suffix = ' - China origin' if measure.startswith('china_') else ''
            add_series(f'baci.{flow}.light.broad.{measure}', f'Light consumer goods {flow}s (broad){suffix}',
                       '轻工业消费品' + ('进口' if flow == 'import' else '出口') + '（宽口径）' + ('中国来源' if suffix else ''),
                       'composition', unit, 'baci', light, measure, BROAD_NOTE)
        light_frames.append(light.assign(flow=flow).rename(columns={'value': 'value_usd', 'share': 'share_merchandise_pct',
                            'gdp': 'share_gdp_pct', 'percap': 'usd_per_person', 'china_value': 'china_value_usd', 'china_share': 'china_share_basket_pct'}))

        flow_ranks = []
        for level in [2, 4, 6]:
            rank = df.assign(code=df.hs6.str[:level]).groupby(['iso3', 'year', 'code'], as_index=False).value.sum()
            # Alphabetical HS code breaks exact value ties reproducibly.
            rank = rank.sort_values(['iso3', 'year', 'value', 'code'], ascending=[True, True, False, True])
            rank['rank'] = rank.groupby(['iso3', 'year']).cumcount() + 1
            rank = rank[rank['rank'].le(100)].copy()
            keys = pd.MultiIndex.from_frame(rank[['iso3', 'year']])
            rank['share'] = 100 * rank.value.to_numpy() / total.reindex(keys).to_numpy()
            rank['level'] = level
            flow_ranks.append(rank)
        ranked = pd.concat(flow_ranks, ignore_index=True)
        for iso, frame in ranked.groupby('iso3'):
            gzip_json(out / 'top-products' / f'{iso}-{flow}.json.gz', rows(frame[['year', 'level', 'rank', 'code', 'value', 'share']]))
        ranking_frames.append(ranked.assign(flow=flow).rename(columns={'value': 'value_usd', 'share': 'share_merchandise_pct'}))
        print(f'Prepared annual {flow}: {len(df):,} product records, {len(total)} country-years', flush=True)

    # Reconcile the independently supplied annual composition file against the product universe.
    provided = pd.read_csv(source / COMPOSITION_FILE)
    provided['classification'] = provided.classification.replace({'stage_of_processing': 'stage', 'technology_group': 'technology'})
    provided['value_usd'] = provided.value_thousand_usd * 1000
    keys = ['iso3', 'year', 'trade_flow', 'classification', 'category']
    assert not provided.duplicated(keys).any()
    actual = pd.DataFrame(composition, columns=keys + ['value_usd']).set_index(keys).value_usd
    supplied = provided.set_index(keys).value_usd
    assert len(supplied.index.difference(actual.index)) == 0
    assert np.allclose(actual, supplied.reindex(actual.index, fill_value=0), rtol=1e-9, atol=1e-4)
    write_json(out / 'products.json', products)
    write_json(out / 'goods-totals.json', totals)
    write_json(out / 'composition.json', composition)
    pd.concat(light_frames, ignore_index=True).to_csv(downloads / 'light_consumer_broad_annual_2000_2024.csv', index=False)
    ranks = pd.concat(ranking_frames, ignore_index=True)
    ranks.to_csv(downloads / 'top_100_products_annual_2000_2024.csv.gz', index=False, compression={'method': 'gzip', 'mtime': 0})
    pd.DataFrame(coverage).to_csv(downloads / 'baci_annual_country_year_coverage.csv', index=False)
    public = {k: v for k, v in manifest.items() if k != 'source'}
    public.update({'source': 'CEPII BACI', 'value_unit': '1000 current USD in source CSV; current USD in browser and derived tables',
                   'quantity_unit': 'metric tonnes; single HS6 only', 'counts': counts, 'light_consumer_definition': BROAD_NOTE,
                   'top_products': 'Top 100 per country, year, flow and HS level (2/4/6); ranks by current USD, ties by HS code',
                   'partner_coverage': 'All-partner totals remain six benchmark years. China-origin imports are annual.',
                   'sha256': {name: hashlib.sha256((source / name).read_bytes()).hexdigest() for name in [*FLOW_FILES.values(), COMPOSITION_FILE]}})
    write_json(downloads / MANIFEST_FILE, public)
    return counts, len(products)

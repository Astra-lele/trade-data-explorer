"""Build a browser-readable, source-preserving snapshot from the existing inventory."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import zipfile

import numpy as np
import pandas as pd
from build_goods import build_goods, YEARS, FLOW_FILES, COMPOSITION_FILE, MANIFEST_FILE

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=ROOT.parent / 'trade_development_master_20261016')
args = parser.parse_args()
SOURCE = args.source
IN = SOURCE / 'data' / 'processed'
OUT = ROOT / 'data'
OUT.mkdir(exist_ok=True)
spec = importlib.util.spec_from_file_location('inventory_config', SOURCE / 'code' / 'config.py')
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)

COUNTRY_ZH = dict(zip(['ETH','KEN','MWI','MOZ','RWA','TZA','UGA','BEN','BFA','CIV','GHA','GIN','GNB','SEN','SLE','TGO','VNM','BGD','COL','PER'],
    ['埃塞俄比亚','肯尼亚','马拉维','莫桑比克','卢旺达','坦桑尼亚','乌干达','贝宁','布基纳法索','科特迪瓦','加纳','几内亚','几内亚比绍','塞内加尔','塞拉利昂','多哥','越南','孟加拉国','哥伦比亚','秘鲁']))
TOPICS = [
    ('scale','Trade & balances','贸易与外部余额','arrow-left-right'),
    ('composition','Goods composition','商品贸易结构','chart-bar-stacked'),
    ('products','Product detail','商品明细','package-search'),
    ('partners','Trading partners','贸易伙伴','network'),
    ('prices','Value, volume & prices','价值、数量与价格','chart-no-axes-combined'),
    ('services','Services & tourism','服务贸易与旅游','plane'),
    ('investment','FDI & infrastructure','FDI与基础设施','landmark'),
    ('economy','Economy & sectors','经济与部门数据','factory'),
]
SOURCES = {
    'wdi': {'name':'World Bank WDI','url':'https://databank.worldbank.org/source/world-development-indicators','note':'Annual series. Coverage differs by indicator. Original indicator codes are retained. National-accounts trade, merchandise customs statistics and balance-of-payments services are different concepts.'},
    'baci': {'name':'CEPII BACI HS92, V202601','url':'https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37','note':'Product detail, composition and China-origin imports: annual 2000-2024 for all 20 countries. Other partner totals: 2000, 2005, 2010, 2015, 2019, 2023 only. Original thousand USD converted to current USD. Quantities are metric tonnes, offered only for single HS6 codes. Unit values are not pure price indices. An unrecorded product-year is not automatically zero.'},
    'wits': {'name':'WITS / UNCTAD classifications','url':'https://wits.worldbank.org/referencedata.html','note':'HS92 product mappings for stage of processing and technology groups. Unclassified products retained in denominators.'},
    'bits': {'name':'IMF BiTS research dataset','url':'https://data.imf.org/en/datasets/IMF:EXTERNAL_DATASET_CARDS/IMF:BiTS','note':'2000-2023. USD millions converted to USD. Country totals use world-total records where available; otherwise sums of available bilateral observations. Bilateral coverage can be incomplete. Parent categories and subcategories must not be added together.'},
    'ilo': {'name':'ILOSTAT','url':'https://rplumber.ilo.org/data/indicator/?id=EMP_TEMP_SEX_ECO_NB_A','note':'Manufacturing employment shares. Modelled and observed estimates remain separate. Industry is broader than manufacturing.'},
    'unsd': {'name':'UNSD National Accounts','url':'https://unstats.un.org/unsd/snaama/Downloads','note':'Alternative manufacturing value-added share, 2000-2024. Kept as a separate series, without splicing WDI observations.'},
    'weo': {'name':'IMF WEO, October 2026','url':'https://data.imf.org/datasets/WEO','note':'Alternative current-account-to-GDP series. May include IMF staff estimates. The snapshot records the October 2026 vintage.'},
    'tourism': {'name':'UN Tourism via Our World in Data','url':'https://ourworldindata.org/tourism','note':'Alternative international tourist arrivals series. Country coverage is uneven. Arrivals and travel-service export receipts are different measures.'},
}
EN = {
 'goods_services_exports_share_gdp':'Exports of goods & services', 'goods_services_imports_share_gdp':'Imports of goods & services',
 'goods_services_trade_balance_share_gdp':'Goods & services trade balance', 'merchandise_trade_balance_share_gdp':'Merchandise trade balance',
 'service_trade_balance_share_gdp':'Services trade balance (WDI)', 'current_account_balance_share_gdp':'Current account balance (WDI)',
 'manufacturing_value_added_share_gdp':'Manufacturing value added (WDI)', 'services_value_added_share_gdp':'Services value added',
 'agriculture_value_added_share_gdp':'Agriculture value added', 'manufacturing_employment_share_modelled':'Manufacturing employment (modelled)',
 'manufacturing_employment_share_observed':'Manufacturing employment (observed)', 'services_employment_share_pct':'Services employment',
 'industry_employment_share_pct':'Industry employment', 'agriculture_employment_share_pct':'Agriculture employment',
 'fdi_net_inflows_share_gdp':'FDI net inflows', 'fdi_net_inflows_current_usd':'FDI net inflows', 'trade_openness_share_gdp':'Trade openness',
 'goods_services_trade_balance_current_usd':'Goods & services trade balance', 'merchandise_trade_balance_current_usd':'Merchandise trade balance',
 'service_trade_balance_current_usd':'Services trade balance (WDI)', 'goods_services_imports_per_capita_usd':'Goods & services imports per person',
 'merchandise_imports_per_capita_usd':'Merchandise imports per person', 'resource_exports_share_merchandise_pct':'Fuel, ores & metals share of merchandise exports (WDI)',
 'tourism_receipts_per_arrival_usd':'Tourism receipts per international arrival',
 'private_infrastructure_investment_total_usd':'Private infrastructure commitments (recorded sectors)',
 'private_infrastructure_investment_share_gdp':'Private infrastructure commitments',
}
ZH = {
 'gdp_current_usd':'GDP（当年美元）','gdp_per_capita_constant_2015_usd':'实际人均GDP（2015年美元）','real_gdp_growth_pct':'实际GDP增长率','population':'人口','urban_population_share_pct':'城市人口占比',
 'natural_resource_rents_share_gdp':'自然资源租金占GDP','goods_services_exports_current_usd':'商品与服务出口额','goods_services_imports_current_usd':'商品与服务进口额',
 'goods_services_exports_share_gdp':'商品与服务出口占GDP','goods_services_imports_share_gdp':'商品与服务进口占GDP','trade_openness_share_gdp':'贸易开放度',
 'current_account_balance_share_gdp':'经常账户余额占GDP（WDI）','merchandise_imports_current_usd':'商品进口额','merchandise_exports_current_usd':'商品出口额',
 'net_barter_terms_of_trade_index_2015_100':'净易货贸易条件指数','fdi_net_inflows_current_usd':'FDI净流入额','fdi_net_inflows_share_gdp':'FDI净流入占GDP',
 'manufacturing_value_added_share_gdp':'制造业增加值占GDP（WDI）','services_value_added_share_gdp':'服务业增加值占GDP','agriculture_value_added_share_gdp':'农业增加值占GDP',
 'agriculture_employment_share_pct':'农业就业占比','industry_employment_share_pct':'工业就业占比','services_employment_share_pct':'服务业就业占比',
 'goods_services_trade_balance_current_usd':'商品与服务贸易余额','goods_services_trade_balance_share_gdp':'商品与服务贸易余额占GDP',
 'merchandise_trade_balance_current_usd':'商品贸易余额','service_trade_balance_current_usd':'服务贸易余额（WDI）',
 'merchandise_trade_balance_share_gdp':'商品贸易余额占GDP','service_trade_balance_share_gdp':'服务贸易余额占GDP（WDI）',
 'goods_services_imports_per_capita_usd':'人均商品与服务进口额','merchandise_imports_per_capita_usd':'人均商品进口额','resource_exports_share_merchandise_pct':'燃料及矿石金属出口占比（WDI）',
 'international_tourist_arrivals':'国际游客到访人次（WDI）','international_tourism_receipts_current_usd':'国际旅游收入','tourism_receipts_per_arrival_usd':'每次国际游客到访对应的旅游收入',
 'private_infrastructure_investment_total_usd':'私人参与基础设施投资承诺（已记录部门合计）','private_infrastructure_investment_share_gdp':'私人参与基础设施投资承诺占GDP',
}
for flow, zhflow in [('import','进口'),('export','出口')]:
    for kind, zhkind in [('value','金额'),('volume','数量'),('unit_value','单位价值')]:
        ZH[f'merchandise_{flow}_{kind}_index_2015_100'] = f'商品{zhflow}{zhkind}指数（2015=100）'
    for key, label in [('food','食品'),('agricultural_raw_material','农业原材料'),('fuel','燃料'),('ores_metals','矿石与金属'),('manufactures','制成品')]:
        for suffix in ['share_merchandise_pct','share_pct']:
            ZH[f'{key}_{flow}s_{suffix}'] = f'{label}{zhflow}占商品{zhflow}比重（WDI）'
    for key,label in [('service','服务'),('travel_service','旅行服务'),('transport_service','运输服务'),('ict_service','ICT服务')]:
        ZH[f'{key}_{flow}s_current_usd'] = f'{label}{zhflow}额（WDI）'
    ZH[f'communications_computer_other_share_service_{flow}s_pct'] = f'通信、计算机及其他服务占服务{zhflow}比重'
    ZH[f'insurance_finance_share_service_{flow}s_pct'] = f'保险与金融占服务{zhflow}比重'
ZH['service_trade_share_gdp'] = '服务进出口总额占GDP'
for key,label in [('energy','能源'),('ict','信息通信'),('transport','交通'),('water','水务')]:
    ZH[f'private_infrastructure_investment_{key}_usd'] = f'{label}私人参与基础设施投资承诺'

STAGE_ZH = {'Raw materials':'原材料','Intermediate goods':'中间品','Capital goods':'资本品','Consumer goods':'消费品','Unclassified':'未分类'}
TECH_ZH = {'Primary products':'初级产品','Resource-based manufactures':'资源型制成品','Low-technology manufactures':'低技术制成品','Medium-technology manufactures':'中技术制成品','High-technology manufactures':'高技术制成品','Other / unclassified':'其他或未分类'}
SERVICE_ZH = {'S':'服务总额','SA':'加工服务','SB':'维修服务','SC':'运输','SC1':'海运','SC2':'空运','SC3':'其他运输方式','SC4':'邮政与快递','SD':'旅行','SDA':'商务旅行','SDB':'个人旅行','SE':'建筑','SE1':'境外建筑','SE2':'境内建筑','SF':'保险和养老金','SF1':'直接保险','SF2':'再保险','SF3':'辅助保险','SF4':'养老金及标准化担保','SG':'金融','SG1':'明确收费的金融服务','SG2':'间接计量的金融中介服务','SH':'知识产权使用费','SI':'通信、计算机及信息','SI1':'通信','SI2':'计算机','SI3':'信息','SJ':'其他商业服务','SJ1':'研发','SJ2':'专业和管理咨询','SJ3':'技术、贸易及其他商业服务','SK':'个人、文化和娱乐','SK1':'视听及相关服务','SK2':'其他个人文化娱乐服务','SL':'政府服务'}

def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':'), allow_nan=False), encoding='utf-8')


def native(v):
    if pd.isna(v):
        return None
    if isinstance(v, (np.integer, np.floating)):
        return v.item()
    return v


def rows(df):
    return [[native(v) for v in row] for row in df.itertuples(index=False, name=None)]


SERIES = {}
INDICATORS = []
def add_series(id, name, zh, topic, unit, source, frame, col='value', note='', code='', frequency='annual'):
    if any(m['id'] == id for m in INDICATORS):
        raise ValueError('Duplicate indicator: ' + id)
    data = {}
    valid = frame[['iso3','year',col]].replace([np.inf,-np.inf],np.nan).dropna(subset=[col]).copy()
    if valid.duplicated(['iso3','year']).any():
        raise ValueError('Duplicate country-year: ' + id)
    for country,g in valid.groupby('iso3'):
        data[country] = [[int(y),float(v)] for y,v in g.sort_values('year')[['year',col]].itertuples(index=False,name=None)]
    years = sorted(valid.year.unique().astype(int).tolist())
    SERIES[id] = data
    INDICATORS.append({'id':id,'name':name,'zh':zh,'topic':topic,'unit':unit,'source':source,'note':note,'code':code,
        'frequency':frequency,'years':years,'n':len(valid),'countries':len(data)})


def topic_for(var, group=''):
    if 'index' in var:
        return 'prices'
    if 'infrastructure' in var or 'fdi' in var:
        return 'investment'
    if 'value_added' in var or 'employment' in var or var.startswith(('gdp','real_gdp','population','urban','natural_resource')):
        return 'economy'
    if group in ['Goods composition','Resources'] or var == 'resource_exports_share_merchandise_pct':
        return 'composition'
    if 'service' in var and not var.startswith('goods_services') or 'touris' in var or 'arrival' in var:
        return 'services'
    return 'scale'


def unit_for(var, default=''):
    if 'index' in var:
        return 'index (2015=100)'
    if 'share_gdp' in var or 'share_gdp' in default:
        return '% of GDP'
    if 'share' in var or var.endswith('_pct'):
        return '%'
    if 'per_capita' in var:
        return 'constant 2015 USD/person' if 'constant' in var else 'USD/person'
    if 'per_arrival' in var:
        return 'USD/arrival'
    if var == 'population':
        return 'persons'
    if 'arrivals' in var:
        return 'arrivals'
    return 'USD'


macro = pd.read_csv(IN / 'world_bank_country_year_panel.csv')
catalog_raw = json.loads((SOURCE / 'data' / 'raw' / 'world_bank_indicator_catalog.json').read_text(encoding='utf-8'))
wb_meta = {r['id']:r for r in catalog_raw[1]}
config_meta = {i['variable']:i for i in config.WDI_INDICATORS}
derived_notes = {
 'goods_services_trade_balance_current_usd':'National accounts exports minus imports of goods and services.',
 'goods_services_trade_balance_share_gdp':'National accounts exports/GDP minus imports/GDP. Not necessarily equal to customs goods plus BOP services balances.',
 'merchandise_trade_balance_current_usd':'Merchandise exports minus merchandise imports. Customs merchandise concept.',
 'service_trade_balance_current_usd':'WDI balance-of-payments service exports minus imports.',
 'resource_exports_share_merchandise_pct':'WDI fuel export share plus ores and metals export share. Does not include all agricultural or resource-based goods.',
 'tourism_receipts_per_arrival_usd':'Recorded international tourism receipts divided by recorded arrivals in the same year. Definition and coverage may differ.',
}
for col in macro.columns:
    if col in ['iso3','country','region','year']:
        continue
    m = config_meta.get(col, {})
    meta = wb_meta.get(m.get('code'), {})
    name = EN.get(col, meta.get('name',col.replace('_',' ').capitalize()))
    note = derived_notes.get(col, meta.get('sourceNote',m.get('purpose','Derived from the same-country, same-year WDI observations.')))
    if 'infrastructure' in col:
        note += ' Investment commitments with private participation, not all infrastructure investment or infrastructure FDI. Missing years are not zeros. Aggregated values sum only recorded sectors.'
    add_series(col,name,ZH.get(col,name),topic_for(col,m.get('group','')),unit_for(col), 'wdi',macro,col,note,m.get('code',''))

for kind in ['merchandise','service']:
    id = kind + '_trade_balance_share_gdp'
    if id not in SERIES:
        frame = macro.assign(value=100*macro[kind+'_trade_balance_current_usd']/macro.gdp_current_usd)
        add_series(id,EN[id],ZH[id],'scale','% of GDP','wdi',frame,note=derived_notes[kind+'_trade_balance_current_usd']+' Divided by current-dollar GDP.')

for file,id,label,zh,source,unit in [
    ('alternative_unsd_manufacturing_va_share.csv','unsd_manufacturing_va_share','Manufacturing value added (UNSD)','制造业增加值占GDP（UNSD）','unsd','% of GDP'),
    ('alternative_imf_weo_current_account.csv','weo_current_account_share','Current account balance (IMF WEO)','经常账户余额占GDP（IMF WEO）','weo','% of GDP'),
    ('alternative_un_tourism_arrivals.csv','un_tourism_arrivals','International tourist arrivals (UN Tourism)','国际游客到访人次（UN Tourism）','tourism','arrivals')]:
    frame = pd.read_csv(IN / file)
    add_series(id,label,zh,'scale' if source=='weo' else 'services' if source=='tourism' else 'economy',unit,source,frame,note=SOURCES[source]['note'])
ilo = pd.read_csv(IN / 'ilostat_manufacturing_employment.csv')
for kind in ['modelled','observed']:
    col = 'manufacturing_employment_share_'+kind
    add_series(col,EN[col],'制造业就业占比（'+('模型估计' if kind=='modelled' else '观测数据')+'）','economy','% of employment','ilo',ilo,col,note=SOURCES['ilo']['note'])
write_json(OUT/'ilo-observed-sources.json',ilo[['iso3','year','observed_source']].dropna().to_dict('records'))

gdp = macro.set_index(['iso3','year']).gdp_current_usd
pop = macro.set_index(['iso3','year']).population
counts, product_count = build_goods(IN, OUT, ROOT/'downloads', config.COUNTRIES, gdp, pop,
                                  STAGE_ZH, TECH_ZH, add_series, write_json, rows)

partners = pd.read_csv(IN/'merchandise_partner_benchmark.csv.gz')
partners['value'] = partners.value_thousand_usd*1000
partner_names = dict(partners[['partner_iso3','partner_name']].drop_duplicates().itertuples(index=False,name=None))
write_json(OUT/'partners.json',rows(partners[['iso3','year','trade_flow','partner_iso3','value']]))
write_json(OUT/'partner-names.json',partner_names)
for flow in ['import','export']:
    g = partners[partners.trade_flow.eq(flow)].copy()
    total = g.groupby(['iso3','year']).value.sum()
    chn = g[g.partner_iso3.eq('CHN')].groupby(['iso3','year']).value.sum().reindex(total.index,fill_value=0)
    frame = (100*chn/total).rename('value').reset_index()
    if flow == 'export':
        add_series(f'baci.{flow}.china.share',f'China share of merchandise {flow}s','中国占商品出口比重','partners','% of merchandise '+flow+'s','baci',frame,note='China bilateral merchandise value / all recorded bilateral merchandise value.',frequency='benchmark')
    g['share'] = g.value/g.set_index(['iso3','year']).index.map(total)
    hhi = g.assign(value=g.share**2).groupby(['iso3','year']).value.sum().rename('value').reset_index()
    add_series(f'baci.{flow}.partner.hhi',f'{flow.capitalize()} partner concentration (HHI)','商品'+('进口' if flow=='import' else '出口')+'伙伴集中度（HHI）','partners','index (0-1)','baci',hhi,note='Sum of squared partner shares, using all recorded bilateral partners. Ranges from 0 to 1.',frequency='benchmark')

bits = pd.read_csv(IN/'imf_bits_country_year_category.csv')
bits['value'] = bits.value_million_usd*1e6
write_json(OUT/'services.json',rows(bits[['iso3','year','trade_flow','category_code','value','total_method']]))
for (flow,cat),g in bits.groupby(['trade_flow','category_code']):
    frame = g[['iso3','year','value']].copy()
    total = bits[bits.trade_flow.eq(flow)&bits.category_code.eq('S')].set_index(['iso3','year']).value
    frame['gdp'] = 100*frame.value.to_numpy()/np.array([gdp.get((r.iso3,r.year),np.nan) for r in frame.itertuples()])
    denom=np.array([total.get((r.iso3,r.year),np.nan) for r in frame.itertuples()])
    frame['share'] = np.divide(100*frame.value.to_numpy(),denom,out=np.full(len(frame),np.nan),where=denom>0)
    for measure,unit in [('value','USD'),('share','% of service '+flow+'s'),('gdp','% of GDP')]:
        add_series(f'bits.{flow}.{cat}.{measure}',config.BITS_CATEGORY_MAP.get(cat,cat)+' '+flow+'s (BiTS)',SERVICE_ZH.get(cat,cat)+('进口' if flow=='import' else '出口')+'（BiTS）','services',unit,'bits',frame,measure,SOURCES['bits']['note'],code=cat)

bilateral = pd.read_csv(IN/'imf_bits_bilateral_services.csv.gz')
bilateral['value'] = bilateral.value_million_usd*1e6
for iso,g in bilateral.groupby('iso3'):
    write_json(OUT/'services'/f'{iso}.json',rows(g[['year','trade_flow','category_code','partner_iso3','value','source','is_world_total']]))
counts['bilateral_service_rows'] = len(bilateral)
counts['goods_partner_rows'] = len(partners)

def bits_balance(col, label, zh):
    piv = bits[bits.category_code.eq('S')].pivot(index=['iso3','year'],columns='trade_flow',values='value')
    frame = (piv['export']-piv['import']).rename('value').reset_index()
    frame['value'] = 100*frame.value.to_numpy()/np.array([gdp.get((r.iso3,r.year),np.nan) for r in frame.itertuples()])
    add_series(col,label,zh,'scale','% of GDP','bits',frame,note='BiTS total services exports minus imports, divided by same-year WDI GDP. This is not an accounting decomposition of WDI national-accounts total trade.')
bits_balance('bits_service_balance_share_gdp','Services trade balance (BiTS)','服务贸易余额占GDP（BiTS）')

downloads = []
download_dir = ROOT/'downloads'
download_dir.mkdir(exist_ok=True)
prepared_files = [*FLOW_FILES.values(), COMPOSITION_FILE, 'alternative_imf_weo_current_account.csv',
    'alternative_un_tourism_arrivals.csv', 'alternative_unsd_manufacturing_va_share.csv', 'country_list.csv',
    'ilostat_manufacturing_employment.csv', 'imf_bits_bilateral_services.csv.gz', 'imf_bits_country_year_category.csv',
    'merchandise_partner_benchmark.csv.gz', 'product_classification_hs92.csv',
    'world_bank_country_year_panel.csv', 'world_bank_master_long.csv.gz']
for name in prepared_files:
    path = IN/name
    if path.exists():
        target = download_dir/path.name
        shutil.copyfile(path,target)
        downloads.append({'name':path.name,'path':'downloads/'+path.name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
for name in ['master_variable_inventory.csv','country_variable_coverage.csv','source_register.csv','alternative_source_country_coverage.csv']:
    path = SOURCE/'tables'/name
    target=download_dir/name
    if name=='master_variable_inventory.csv':
        public=pd.read_csv(path).drop(columns=['requested_by','primary_email_request'],errors='ignore')
        public.to_csv(target,index=False)
    else:
        shutil.copyfile(path,target)
    downloads.append({'name':name,'path':'downloads/'+name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
for name in [MANIFEST_FILE, 'light_consumer_broad_annual_2000_2024.csv', 'top_100_products_annual_2000_2024.csv.gz',
             'baci_annual_country_year_coverage.csv', 'baci_annual_coverage_notes.txt']:
    target = download_dir/name
    downloads.append({'name':name,'path':'downloads/'+name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
# Original source tables stay available; the website's calculations use the normalized series.
write_json(OUT/'series.json',SERIES)
catalog = {'version':'2026-10-16','sampleSize':20,'countries':[{'id':i,'name':n,'zh':COUNTRY_ZH[i],'region':r} for i,(n,r) in config.COUNTRIES.items()],
    'topics':[dict(zip(['id','name','zh','icon'],t)) for t in TOPICS], 'sources':SOURCES,'indicators':INDICATORS,
    'categories':{'stage':STAGE_ZH,'technology':TECH_ZH,'services':{code:{'name':name,'zh':SERVICE_ZH.get(code,name)} for code,name in config.BITS_CATEGORY_MAP.items()}},
    'productColumns':['year','hs6','value_usd','quantity_tonnes','china_value_usd'],
    'topProductColumns':['year','hs_level','rank','code','value_usd','share_merchandise_pct'],
    'productMetadataColumns':['description','stage','technology','broad_light_consumer'],
    'servicePartnerColumns':['year','flow','category','partner','value_usd','source','is_world_total'],
    'benchmarkYears':config.BACI_YEARS,'goodsYears':YEARS,'downloads':downloads,'counts':counts}
write_json(OUT/'catalog.json',catalog)
print(json.dumps({'indicators':len(INDICATORS),'observations':sum(m['n'] for m in INDICATORS),'products':product_count,'counts':counts},ensure_ascii=False),flush=True)

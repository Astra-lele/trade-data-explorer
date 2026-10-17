import * as D from './data.js?v=partners-en-20261016';
import {t,label,setLanguage,language,regionLabel,unitLabel,num,compact} from './i18n.js?v=partners-en-20261016';
import {esc,COLORS,countryColor,disposeCharts,mountChart,lineOption,rankOption,scatterOption,compositionOption,stackedOption,exportChart} from './charts.js?v=partners-en-20261016';

const $=s=>document.querySelector(s);
const icon=name=>`<i data-lucide="${name}"></i>`;
const button=(action,name,ico,cls='',attrs='')=>`<button data-action="${action}" class="${cls}" ${attrs}>${ico?icon(ico):''}${esc(name)}</button>`;
const iconButton=(action,name,ico,attrs='')=>`<button data-action="${action}" class="icon-button" title="${esc(name)}" aria-label="${esc(name)}" ${attrs}>${icon(ico)}</button>`;
const specOf=id=>({type:'indicator',id});
const DEFAULT={topic:'scale',countries:['ETH','KEN','VNM','BGD'],start:2000,end:2024,year:2024,baseYear:2000,view:'trend',transform:'original',layout:'facets',latest:false,flow:'import',metric:'goods_services_imports_share_gdp',classification:'stage',category:'Capital goods',measure:'share',productCodes:['61'],productLevel:'2',productMeasure:'share',partner:'CHN',partnerMeasure:'share',serviceMode:'categories',serviceCategory:'S',servicePartner:'USA',topN:10,compositionYears:'single',changeKind:'difference',tableLayout:'long',language:'en',compareCompositions:[],compare:[specOf('goods_services_imports_share_gdp'),specOf('manufacturing_employment_share_modelled'),specOf('fdi_net_inflows_share_gdp')]};
let state=structuredClone(DEFAULT),catalog,currentRows=[],tableColumns=[],tablePage=0,tableSearch='',tableSort=null,currentDatasets=[],renderVersion=0,productQuery='',catalogQuery='',catalogTopic='all',countryDraft=[];
let chartMap=new Map();
const defaults={scale:'goods_services_imports_share_gdp',prices:'merchandise_import_volume_index_2015_100',investment:'fdi_net_inflows_share_gdp',economy:'manufacturing_employment_share_modelled'};
const normalized=()=>state.transform==='rebase';
const saveState=()=>{const text=JSON.stringify(state);history.replaceState(null,'','#'+encodeURIComponent(text));try{localStorage.setItem('trade-explorer-state',text);}catch{}};
const toast=message=>{const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2200);};
const icons=()=>window.lucide?.createIcons();
function select(id,options,value,attrs=''){return `<select id="${id}" ${attrs}>${options.map(o=>{const [v,n]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(n)}</option>`;}).join('')}</select>`;}
function field(title,control,cls=''){return `<div class="field ${cls}"><label>${esc(title)}</label>${control}</div>`;}
function loadState(){
  let source='';try{source=location.hash.length>1?decodeURIComponent(location.hash.slice(1)):localStorage.getItem('trade-explorer-state');const stored=JSON.parse(source||'{}');state={...structuredClone(DEFAULT),...stored};}catch{state=structuredClone(DEFAULT);}
  const validCountries=new Set(catalog.countries.map(c=>c.id));state.countries=Array.isArray(state.countries)?state.countries.filter(c=>validCountries.has(c)):DEFAULT.countries;
  if(!state.countries.length)state.countries=['ETH'];
  if(!catalog.topics.some(x=>x.id===state.topic)&&!['workbench','sources'].includes(state.topic))state.topic='scale';
  state.compare=(Array.isArray(state.compare)?state.compare:DEFAULT.compare).filter(validSpec);
  state.compareCompositions=(Array.isArray(state.compareCompositions)?state.compareCompositions:[]).filter(s=>['stage','technology','hs2','partners','services','servicepartners'].includes(s.kind)&&['import','export'].includes(s.flow));
  if(!D.metaById(state.metric))state.metric=defaults[state.topic]||DEFAULT.metric;
  for(const key of ['start','end','year','baseYear'])state[key]=Math.min(2024,Math.max(1995,Number(state[key])||DEFAULT[key]));
  if(state.start>state.end)[state.start,state.end]=[state.end,state.start];
  if(!Array.isArray(state.productCodes))state.productCodes=['61'];
  state.productCodes=state.productCodes.filter(x=>/^\d{2}(\d{2})?(\d{2})?$/.test(x));
  if(!['trend','ranking','change','table','composition','scatter','topProducts','valueQuantity'].includes(state.view))state.view='trend';
  if(!['original','rebase','gdp','percap','cumulative'].includes(state.transform))state.transform='original';
  if(!['import','export'].includes(state.flow))state.flow='import';
  setLanguage(state.language);
}
function validSpec(s){return s&&((s.type==='indicator'&&D.metaById(s.id))||(s.type==='product'&&Array.isArray(s.codes)&&s.codes.every(c=>/^\d{2}(\d{2})?(\d{2})?$/.test(c)))||(['partner','servicepartner'].includes(s.type)&&typeof s.partner==='string'));}
function countryLabel(iso){return label(D.countryById(iso)||{name:iso});}
function topicLabel(id){return label(catalog.topics.find(x=>x.id===id)||{name:id});}
function nav(){
  $('#sidebar').innerHTML=`<button class="nav-item ${state.topic==='workbench'?'active':''}" data-topic="workbench">${icon('columns-2')}<span>${t('workbench')}</span><span class="nav-count">${state.compare.length}</span></button><div class="nav-label">${t('topics')}</div>${catalog.topics.map(topic=>`<button class="nav-item ${state.topic===topic.id?'active':''}" data-topic="${topic.id}">${icon(topic.icon)}<span>${esc(label(topic))}</span></button>`).join('')}<div class="nav-label">${t('reference')}</div><button class="nav-item ${state.topic==='sources'?'active':''}" data-topic="sources">${icon('database')}<span>${t('sources')}</span></button><div class="sidebar-foot"><strong>20</strong>${t('economies')}<br><span>2000–2024</span></div>`;
  $('[data-t="searchIndicators"]').textContent=t('searchIndicators');$('[data-t="footer"]').textContent=t('footer');
}
function heading(){
  const title=state.topic==='workbench'?t('workbench'):state.topic==='sources'?t('sourceTitle'):topicLabel(state.topic);
  const sub=state.topic==='sources'?t('sourceSubtitle'):`${state.countries.map(countryLabel).join(' · ')}${state.countries.length===20?' · '+t('all'):''}`;
  $('#page-heading').innerHTML=`<div><div class="eyebrow">${t('snapshot')}</div><h1>${esc(title)}</h1><div class="page-summary">${esc(sub)}</div></div><div class="heading-tools">${iconButton('share',t('share'),'link')}${iconButton('focus',t('focus'),'maximize-2')}${iconButton('reset',t('reset'),'rotate-ccw')}</div>`;
}
function filters(){
  if(state.topic==='sources'){$('#filters').innerHTML='';return;}
  const countries=state.countries.length===20?`${t('all')} 20 ${t('countries')}`:state.countries.length>3?`${state.countries.length} ${t('countries')}`:state.countries.map(countryLabel).join(', ');
  const annualYears=Array.from({length:30},(_,i)=>1995+i);
  const ys=state.topic==='partners'?catalog.partnerYears:['composition','products'].includes(state.topic)?catalog.goodsYears:annualYears;
  if(!ys.includes(state.start))state.start=ys.find(y=>y>=state.start)??ys.at(-1);
  if(!ys.includes(state.end))state.end=ys.filter(y=>y<=state.end).at(-1)??ys[0];
  if(state.start>state.end)state.start=state.end;
  if(!ys.includes(state.year))state.year=ys.at(-1);
  $('#filters').innerHTML=`<div class="toolbar">${field(t('countries'),`<button id="country-picker" data-action="countries"><span>${esc(countries)}</span>${icon('chevron-down')}</button>`)}${field(t('period'),`<div class="range-fields">${select('start-year',ys,state.start,'aria-label="'+t('from')+'"')}<span class="range-dash">–</span>${select('end-year',ys,state.end,'aria-label="'+t('to')+'"')}</div>`)}${field(t('year'),select('reference-year',ys,state.year,'aria-label="'+t('year')+'"'))}<div class="field grow"><span class="field-label">${t('coverage')}</span><span style="height:37px;display:flex;align-items:center;font-size:12px;color:var(--muted)">${state.countries.length} / 20 ${t('economies')}</span></div></div>`;
}
function genericMetricOptions(topic){return catalog.indicators.filter(m=>m.topic===topic).map(m=>[m.id,`${label(m)} · ${unitLabel(m.unit)}`]);}
function productSpec(){return {type:'product',flow:state.flow,codes:D.canonicalCodes(state.productCodes),measure:state.productMeasure};}
function partnerSpec(){return {type:'partner',flow:state.flow,partner:state.partner,measure:state.partnerMeasure};}
function serviceSpec(){return state.serviceMode==='partners'?{type:'servicepartner',flow:state.flow,category:state.serviceCategory,partner:state.servicePartner,measure:state.measure}:specOf(`bits.${state.flow}.${state.serviceCategory}.${state.measure==='share'?'share':state.measure==='gdp'?'gdp':'value'}`);}
function moduleControls(){
  const flow=field(t('flow'),select('flow',[['import',t('import')],['export',t('export')]],state.flow));
  const measures=[['share',t('shareTotal')],['value',t('usd')],['gdp',t('gdp')]];
  let content='';
  if(state.topic==='sources'){$('#module-controls').innerHTML='';return;}
  if(state.topic==='workbench'){
    content=`<div class="workbench-toolbar"><span>${state.compare.length} ${t('indicators')}</span>${button('catalog',t('addIndicator'),'plus','primary')}</div><div class="metric-list">${state.compare.map((s,i)=>{const m=D.describe(s);return `<div class="metric-row"><span class="metric-index">${String(i+1).padStart(2,'0')}</span><span class="dot" style="background:${COLORS[i%COLORS.length]}"></span><div class="metric-text">${esc(label(m))}<small>${esc(topicLabel(m.topic))} · ${esc(unitLabel(m.unit))} · ${esc(catalog.sources[m.source]?.name||'')}</small></div>${iconButton('remove-compare',t('remove'),'x',`data-index="${i}"`)}</div>`;}).join('')}</div>`;
  }else if(['scale','prices','investment','economy'].includes(state.topic)){
    content=`<div class="module-bar"><div class="metric-selection">${field(t('indicator'),select('metric',genericMetricOptions(state.topic),state.metric,'class="wide-select" aria-label="'+t('indicator')+'"'),'wide')}${button('add-current',t('addCompare'),'plus')}${iconButton('catalog',t('searchIndicators'),'search')}</div></div>`;
  }else if(state.topic==='composition'){
    const categories=state.classification==='light'?[['broad',t('broad')]]:state.classification==='hs2'?Object.entries(D.HS2).map(([c,n])=>[c,`${c} · ${n[0]}`]):Object.keys(catalog.categories[state.classification]||{}).map(c=>[c,c]);
    if(!categories.some(x=>x[0]===state.category))state.category=categories[0]?.[0]||'Capital goods';
    const allowed=state.classification==='light'?[...measures,['percap',t('percap')],...(state.flow==='import'?[['china_value',t('chinaValue')],['china_share',t('chinaShare')]]:[])]:measures;
    if(!allowed.some(x=>x[0]===state.measure))state.measure='share';
    content=`<div class="module-bar">${flow}${field(t('classification'),select('classification',[['stage',t('stage')],['technology',t('technology')],['hs2',t('hs2')],['light',t('light')]],state.classification))}${field(t('category'),select('category',categories,state.category),'grow')}${field(t('measure'),select('measure',allowed,state.measure))}${button('add-current',t('addCompare'),'plus')}</div><p class="module-note">${t('annualGoodsNote')}${state.classification==='light'?' '+t('broadNote'):''}</p>`;
  }else if(state.topic==='products'){
    const codes=state.productCodes;
    const extra=codes.length===1&&codes[0].length===6?[['quantity',t('quantity')],['unit',t('unitValue')]]:[];
    const china=state.flow==='import'?[['china_value',t('chinaValue')],['china_share',t('chinaShare')]]:[];
    const allowed=[...measures,['percap',t('percap')],...extra,...china];
    if(!allowed.some(x=>x[0]===state.productMeasure))state.productMeasure='share';
    if(state.view==='topProducts'){
      if(!['value','share'].includes(state.productMeasure))state.productMeasure='value';
      content=`<div class="module-bar">${flow}${field(t('productLevel'),select('product-level',[['2',t('hs2')],['4',t('hs4')],['6',t('hs6')]],state.productLevel))}${field(t('measure'),select('product-measure',[['value',t('usd')],['share',t('shareTotal')]],state.productMeasure))}</div><p class="module-note">${t('topProductsNote')}</p>`;
    }else content=`<div class="module-bar">${flow}${field(t('productLevel'),select('product-level',[['2',t('hs2')],['4',t('hs4')],['6',t('hs6')]],state.productLevel))}${field(t('products'),`<input type="search" id="product-search" placeholder="${esc(t('productSearch'))}" value="${esc(productQuery)}" autocomplete="off">`,'grow')}${state.view==='valueQuantity'?'':field(t('measure'),select('product-measure',allowed,state.productMeasure))}${button('add-current',t('addCompare'),'plus','',codes.length?'':'disabled')}</div><div class="basket">${codes.map(c=>`<span class="basket-item"><span>${c} · ${esc(D.productName(c,language))}</span>${iconButton('remove-product',t('remove'),'x',`data-code="${c}"`)}</span>`).join('')}</div><div id="product-results"></div><p class="module-note">${t('annualGoodsNote')} ${t('productNote')}</p>`;
  }else if(state.topic==='partners'){
    const partners=Object.entries(D.partnerNames).sort((a,b)=>a[1].localeCompare(b[1]));
    content=`<div class="module-bar">${flow}${field(t('partner'),select('partner',partners,state.partner),'grow')}${field(t('measure'),select('partner-measure',[...measures,['percap',t('percap')]],state.partnerMeasure))}${button('add-current',t('addCompare'),'plus')}</div><p class="module-note">${t('partnerNote')}</p>`;
  }else if(state.topic==='services'){
    const cats=Object.entries(catalog.categories.services).map(([c,m])=>[c,`${c} · ${label(m)}`]);
    const modes=[['categories',t('serviceTotals')],['partners',t('servicePartners')],['wdi','WDI / UN Tourism']];
    const serviceShare=state.serviceMode==='partners'||state.view==='composition'?t('shareParent'):'Share of total services (%)';
    content=`<div class="module-bar">${field(t('mode'),select('service-mode',modes,state.serviceMode))}${state.serviceMode==='wdi'?field(t('indicator'),select('metric',catalog.indicators.filter(m=>m.topic==='services'&&m.source!=='bits').map(m=>[m.id,`${label(m)} · ${unitLabel(m.unit)}`]),state.metric,'class="wide-select"'),'wide'):`${flow}${field(t('serviceCategory'),select('service-category',cats,state.serviceCategory),'grow')}${state.serviceMode==='partners'?field(t('partner'),select('service-partner',Object.entries(D.partnerNames),state.servicePartner),'grow'):''}${field(t('measure'),select('measure',[['share',serviceShare],['value',t('usd')],['gdp',t('gdp')]],state.measure))}`}${button('add-current',t('addCompare'),'plus')}</div><p class="module-note">${t('bitsNote')}</p>`;
  }
  if(state.topic==='workbench'&&state.compareCompositions.length)content+=`<div class="metric-list">${state.compareCompositions.map((s,i)=>`<div class="metric-row">${icon('chart-bar-stacked')}<div class="metric-text">${esc(compositionLabel(s))}<small>${t('composition')} · ${esc(unitLabel(s.measure==='share'?'%':s.measure==='gdp'?'% of GDP':s.measure==='percap'?'USD/person':'USD'))}</small></div>${iconButton('remove-composition',t('remove'),'x',`data-index="${i}"`)}</div>`).join('')}</div>`;
  else if(allowsComposition()&&state.topic!=='workbench')content+=`<div style="padding-bottom:12px">${button('add-composition','Add composition to workspace','chart-bar-stacked','text-button')}</div>`;
  $('#module-controls').innerHTML=content;
  if(state.topic==='products')renderProductSearch();
}
function allowsComposition(){return state.topic==='workbench'?state.compareCompositions.length>0:state.topic==='composition'&&state.classification!=='light'||state.topic==='partners'||state.topic==='services'&&state.serviceMode!=='wdi';}
function viewControls(){
  if(state.topic==='sources'){$('#view-controls').innerHTML='';return;}
  const singleHS6=state.productCodes.length===1&&state.productCodes[0].length===6;
  const views=[['trend','chart-line'],['ranking','chart-bar'],['change','arrow-right-left'],...(allowsComposition()?[['composition','chart-bar-stacked']]:[]),...(state.topic==='products'?[['topProducts','list-ordered'],...(singleHS6?[['valueQuantity','panels-top-left']]:[])]:[]),...(state.topic==='workbench'?[['scatter','scatter-chart']]:[]),['table','table-2']];
  if(!views.some(x=>x[0]===state.view))state.view='trend';
  let options='';
  if(state.view==='trend')options=`${select('layout',[['facets',t('facets')],['overlay',t('overlay')]],state.layout,'aria-label="'+t('layout')+'"')}${select('transform',[['original',t('original')],['rebase',t('rebase')],['gdp',t('gdp')],['percap',t('percap')],...(state.topic==='investment'?[['cumulative','Cumulative recorded values']]:[])],state.transform,'aria-label="'+t('format')+'"')}${normalized()?select('base-year',Array.from({length:30},(_,i)=>1995+i),state.baseYear,'aria-label="'+t('baseYear')+'"'):''}`;
  if(state.view==='ranking'||state.view==='table')options+=`<label class="filter-inline"><input type="checkbox" id="latest" ${state.latest?'checked':''}>${t('latest')}</label>`;
  if(state.view==='change')options=select('change-kind',[['difference',t('difference')],['growth',t('growth')]],state.changeKind,'aria-label="'+t('measure')+'"');
  if(state.view==='table')options+=select('table-layout',[['long','Full time series'],['matrix','Country-by-indicator']],state.tableLayout,'aria-label="'+t('layout')+'"');
  if(state.view==='composition'){
    if(![0,5,10,20].includes(state.topN))state.topN=10;
    options=`${select('top-n',[[5,t('top5')],[10,t('top10')],[20,t('top20')],[0,t('allItems')]],state.topN,'aria-label="'+t('topN')+'"')}${select('composition-years',[['single',t('singleYear')],['both',t('startEnd')]],state.compositionYears,'aria-label="'+t('compareYears')+'"')}`;
  }
  if(state.view==='topProducts'){
    if(![5,10,20,50,100].includes(state.topN))state.topN=10;
    options=select('top-n',[5,10,20,50,100].map(n=>[n,`Top ${n}`]),state.topN,'aria-label="'+t('topN')+'"');
  }
  if(state.view==='scatter'){
    const opt=state.compare.map((s,i)=>[i,label(D.describe(s))]);
    state.xIndex=Math.min(state.xIndex||0,Math.max(0,opt.length-1));state.yIndex=Math.min(state.yIndex??1,Math.max(0,opt.length-1));
    options=`<span>${t('xAxis')}</span>${select('x-index',opt,state.xIndex)}<span>${t('yAxis')}</span>${select('y-index',opt,state.yIndex)}`;
  }
  $('#view-controls').innerHTML=`<div class="viewbar"><div class="view-tabs">${views.map(([v,i])=>`<button class="view-tab ${state.view===v?'active':''}" data-view="${v}">${icon(i)}${t(v)}</button>`).join('')}</div><div class="view-options">${options}</div></div>`;
}
function activeSpecs(){
  if(state.topic==='workbench')return state.compare;
  if(['scale','prices','investment','economy'].includes(state.topic)||state.topic==='services'&&state.serviceMode==='wdi')return [specOf(state.metric)];
  if(state.topic==='products')return state.productCodes.length?(state.view==='valueQuantity'?['value','quantity','unit'].map(measure=>({...productSpec(),measure})):[productSpec()]):[];
  if(state.topic==='partners')return [partnerSpec()];
  if(state.topic==='services')return [serviceSpec()];
  if(state.topic==='composition'){
    if(state.classification==='hs2')return [{type:'product',flow:state.flow,codes:[state.category],measure:state.measure}];
    return [specOf(`baci.${state.flow}.${state.classification}.${state.category}.${state.measure}`)];
  }
  return [];
}
function empty(message=t('noData'),detail=t('noDataDetail')){return `<div class="empty-state">${icon('chart-no-axes-combined')}<strong>${esc(message)}</strong><span>${esc(detail)}</span></div>`;}
function chartSection(title,unit,source,note='',large=false){
  const id='chart-'+chartMap.size+'-'+Math.random().toString(36).slice(2,8);
  const node=document.createElement('section');node.className='chart-section';
  node.innerHTML=`<div class="chart-header"><div><div class="chart-title">${esc(title)}</div><div class="chart-unit">${esc(unitLabel(unit))}${source?' · '+esc(catalog.sources[source]?.name||source):''}</div></div><div class="chart-actions">${iconButton('export-png',t('png'),'download',`data-chart="${id}"`)}${iconButton('export-svg',t('svg'),'image',`data-chart="${id}"`)}</div></div><div class="chart ${large?'large':''}" id="${id}"></div>${note?`<div class="chart-note">${esc(note)}</div>`:''}`;
  return {node,id,element:node.querySelector('.chart')};
}
function addChart(grid,section,option,group){grid.append(section.node);const chart=mountChart(section.element,option,group);chartMap.set(section.id,{chart,title:section.node.querySelector('.chart-title').textContent});return chart;}
function resultHeader(count,extra=''){return `<div class="countline"><span><strong>${num(count,0)}</strong> ${t('dataCount')}${extra?' · '+esc(extra):''}</span>${button('download',t('download'),'download','text-button')}</div>`;}
function getVisiblePoints(points,meta,iso){const visible=(points||[]).filter(p=>p[0]>=state.start&&p[0]<=state.end);return D.transformPoints(visible,state.transform,state.baseYear,meta.unit,iso);}
function displayUnit(meta){return normalized()?`${state.baseYear} = 100`:state.transform==='gdp'?'% of GDP':state.transform==='percap'?'USD/person':state.transform==='cumulative'?meta.unit+' (cumulative recorded)':meta.unit;}
function buildRows(datasets){
  return datasets.flatMap(({meta,data})=>state.countries.flatMap(iso=>(data[iso]||[]).filter(([y])=>y>=state.start&&y<=state.end).map(([year,value])=>({iso3:iso,country:countryLabel(iso),indicator:label(meta),indicator_id:meta.id,year,value,unit:meta.unit,source:catalog.sources[meta.source]?.name||meta.source,source_url:catalog.sources[meta.source]?.url||'',definition:meta.note||''}))));
}
function showTrends(datasets){
  currentRows=datasets.flatMap(({meta,data})=>state.countries.flatMap(iso=>getVisiblePoints(data[iso],meta,iso).map(([year,value])=>({iso3:iso,country:countryLabel(iso),indicator:label(meta),indicator_id:meta.id,year,value,unit:displayUnit(meta),raw_value:D.at(data[iso],year),raw_unit:meta.unit,transformation:state.transform,base_year:normalized()?state.baseYear:null,source:catalog.sources[meta.source]?.name,source_url:catalog.sources[meta.source]?.url,definition:meta.note||''}))));const count=currentRows.filter(r=>D.isNumber(r.value)).length;
  const selectedUnits=new Set(datasets.map(d=>d.meta.unit));
  let notice=normalized()?`<div class="notice">${t('baseMissing')}</div>`:'';
  const compatible=['rebase','gdp','percap'].includes(state.transform)||selectedUnits.size<=1;
  if(['gdp','percap','cumulative'].includes(state.transform))notice+=`<div class="notice">This transformation applies only to current-dollar amount series. Existing shares, indexes and counts are not transformed.</div>`;
  if(state.layout==='overlay'&&!compatible)notice+=`<div class="notice warning">${t('mixedUnits')}</div>`;
  if(state.transform==='cumulative')notice+=`<div class="notice">${t('infrastructureNote')} Cumulative FDI flows are not FDI stocks.</div>`;
  $('#results').innerHTML=resultHeader(count,`${state.start}–${state.end}`)+notice+`<div class="chart-grid ${(datasets.length===1||state.layout==='overlay'&&compatible)&&state.countries.length<=6?'single':''}" id="chart-grid"></div>`;
  const grid=$('#chart-grid'),years=Array.from({length:state.end-state.start+1},(_,i)=>state.start+i);
  const linesFor=({meta,data})=>state.countries.map(iso=>({name:countryLabel(iso),iso,points:getVisiblePoints(data[iso],meta,iso),benchmark:meta.frequency==='benchmark',color:countryColor(iso)})).filter(x=>x.points.some(p=>D.isNumber(p[1])));
  const unitFor=displayUnit;
  if(state.layout==='overlay'&&compatible&&datasets.length>1){
    const lines=datasets.flatMap((d,i)=>linesFor(d).map(l=>({...l,name:`${l.name} · ${label(d.meta)}`,color:COLORS[(i*state.countries.length+state.countries.indexOf(l.iso))%COLORS.length]})));
    if(!lines.length){grid.innerHTML=empty();return;}
    grid.classList.add('single');const sec=chartSection(t('workbench'),unitFor(datasets[0].meta),'',datasets.some(d=>d.meta.frequency==='benchmark')?t('benchmarkNote'):'',true);addChart(grid,sec,lineOption(lines,years),'trends');
  }else for(const d of datasets){
    const lines=linesFor(d);
    if(!lines.length){const sec=chartSection(label(d.meta),unitFor(d.meta),d.meta.source);sec.element.innerHTML=empty();grid.append(sec.node);continue;}
    if(state.countries.length>6){
      for(const line of lines){const sec=chartSection(`${line.name} · ${label(d.meta)}`,unitFor(d.meta),d.meta.source,d.meta.frequency==='benchmark'?t('benchmarkNote'):'');addChart(grid,sec,lineOption([line],years),'trends');}
    }else{const sec=chartSection(label(d.meta),unitFor(d.meta),d.meta.source,d.meta.frequency==='benchmark'?t('benchmarkNote'):'',datasets.length===1);addChart(grid,sec,lineOption(lines,years),'trends');}
  }
}
function showRanking(datasets){
  currentRows=[];$('#results').innerHTML=`<div class="countline"><span>${state.latest?t('latestNote'):t('sameYearNote')}</span>${button('download',t('download'),'download','text-button')}</div><div class="chart-grid ${datasets.length===1?'single':''}" id="chart-grid"></div>`;
  const grid=$('#chart-grid');
  for(const {meta,data}of datasets){const rows=state.countries.map(iso=>{const obs=D.observation(data[iso],state.latest?state.end:state.year,state.latest,state.start);return {iso,name:countryLabel(iso)+(state.latest&&obs.year?` (${obs.year})`:''),...obs};});
    currentRows.push(...rows.map(r=>({iso3:r.iso,country:countryLabel(r.iso),indicator:label(meta),indicator_id:meta.id,year:r.year,value:r.value,unit:meta.unit,source:catalog.sources[meta.source]?.name,source_url:catalog.sources[meta.source]?.url})));
    const valid=rows.filter(r=>D.isNumber(r.value)).sort((a,b)=>b.value-a.value);const sec=chartSection(`${label(meta)} · ${state.latest?t('latest'):state.year}`,meta.unit,meta.source,`${valid.length}/${state.countries.length} ${t('countries')} · ${t('zeroNote')}`,datasets.length===1);
    if(!valid.length){sec.element.innerHTML=empty();grid.append(sec.node);continue;}
    sec.element.style.height=Math.max(290,valid.length*28+65)+'px';addChart(grid,sec,rankOption(valid,meta.unit));
  }
}
async function showTopProducts(version){
  const cases=await Promise.all(state.countries.map(async iso=>({iso,rows:await D.getTopProducts(iso,state.year,state.flow,Number(state.productLevel),state.topN)})));
  if(version!==renderVersion)return;
  const unit=state.productMeasure==='share'?`% of merchandise ${state.flow}s`:'USD';
  currentRows=cases.flatMap(({rows})=>rows.map(r=>({iso3:r.iso,country:countryLabel(r.iso),year:r.year,flow:state.flow,hs_level:r.level,rank:r.rank,hs_code:r.code,product:D.productName(r.code,language),value_usd:r.value,share_merchandise_pct:r.share,source:catalog.sources.baci.name,source_url:catalog.sources.baci.url})));
  currentDatasets=[];
  $('#results').innerHTML=resultHeader(currentRows.length,`${state.year} · HS${state.productLevel} · ${t(state.flow)}`)+`<div class="chart-grid ${cases.length===1?'single':''}" id="chart-grid"></div>`;
  for(const {iso,rows}of cases){
    const sec=chartSection(`${countryLabel(iso)} · ${state.year}`,unit,'baci');
    if(!rows.length){sec.element.innerHTML=empty();$('#chart-grid').append(sec.node);continue;}
    const values=rows.map(r=>({name:`${r.code} · ${D.productName(r.code,language)}`,value:state.productMeasure==='share'?r.share:r.value,iso}));
    sec.element.style.height=Math.max(320,rows.length*29+65)+'px';
    const chart=addChart($('#chart-grid'),sec,rankOption(values,unit));
    chart.on('click',p=>{const r=rows[p.dataIndex];if(r){state.productCodes=[r.code];state.productMeasure='value';state.view=r.level===6?'valueQuantity':'trend';render();}});
  }
  $('#metadata').innerHTML=`<div class="notice">${t('topProductsNote')} ${t('annualGoodsNote')}</div>`;icons();
}

async function showValueQuantity(version){
  const measures=[['value','usd'],['quantity','quantity'],['unit','unitValue']];
  const datasets=await Promise.all(measures.map(async ([measure])=>{
    const spec={...productSpec(),measure};return {meta:D.describe(spec),data:await D.getSeries(spec,state.countries)};
  }));
  if(version!==renderVersion)return;
  currentDatasets=datasets;
  currentRows=state.countries.flatMap(iso=>{
    const years=[...new Set(datasets.flatMap(d=>(d.data[iso]||[]).map(p=>p[0])))].filter(y=>y>=state.start&&y<=state.end).sort((a,b)=>a-b);
    return years.map(year=>({iso3:iso,country:countryLabel(iso),year,flow:state.flow,hs6:state.productCodes[0],
      product:D.productName(state.productCodes[0],language),value_usd:D.at(datasets[0].data[iso],year),
      quantity_tonnes:D.at(datasets[1].data[iso],year),unit_value_usd_per_tonne:D.at(datasets[2].data[iso],year),
      source:catalog.sources.baci.name,source_url:catalog.sources.baci.url}));
  });
  $('#results').innerHTML=resultHeader(currentRows.length,`${state.start}–${state.end} · HS${state.productCodes[0]}`)+`<div class="notice">${t('valueIdentity')} ${t('productNote')}</div><div id="quantity-panels"></div>`;
  const years=Array.from({length:state.end-state.start+1},(_,i)=>state.start+i);
  for(const iso of state.countries){
    const group=document.createElement('section');group.className='quantity-country';
    group.innerHTML=`<h2>${esc(countryLabel(iso))} · ${t(state.flow)}</h2><div class="quantity-grid"></div>`;
    $('#quantity-panels').append(group);const grid=group.querySelector('.quantity-grid');
    datasets.forEach(({meta,data},i)=>{
      const points=(data[iso]||[]).filter(p=>p[0]>=state.start&&p[0]<=state.end);
      const sec=chartSection(t(measures[i][1]),meta.unit,'baci');
      if(!points.some(p=>D.isNumber(p[1]))){sec.element.innerHTML=empty();grid.append(sec.node);return;}
      addChart(grid,sec,lineOption([{name:countryLabel(iso),points,color:countryColor(iso)}],years),'quantity-'+iso);
    });
  }
  metadata(datasets);icons();
}
function showChange(datasets){
  currentRows=[];$('#results').innerHTML=`<div class="countline"><span>${state.start}–${state.end} · ${t('unitsNote')}</span>${button('download',t('download'),'download','text-button')}</div><div class="chart-grid ${datasets.length===1?'single':''}" id="chart-grid"></div>`;const grid=$('#chart-grid');
  for(const {meta,data}of datasets){const unit=state.changeKind==='growth'?'%':meta.unit.startsWith('%')?t('pp'):meta.unit;
    const rows=state.countries.map(iso=>{const start=D.at(data[iso],state.start),end=D.at(data[iso],state.end);return {iso,name:countryLabel(iso),start,end,value:D.changeValue(start,end,state.changeKind)};});
    currentRows.push(...rows.map(r=>({iso3:r.iso,country:r.name,indicator:label(meta),indicator_id:meta.id,start_year:state.start,end_year:state.end,start_value:r.start,end_value:r.end,value:r.value,unit,source:catalog.sources[meta.source]?.name,source_url:catalog.sources[meta.source]?.url})));
    const valid=rows.filter(r=>D.isNumber(r.value)).sort((a,b)=>b.value-a.value),sec=chartSection(label(meta),unit,meta.source,`${state.start}–${state.end} · ${valid.length}/${state.countries.length} ${t('countries')}`,datasets.length===1);
    if(!valid.length){sec.element.innerHTML=empty();grid.append(sec.node);continue;}
    sec.element.style.height=Math.max(290,valid.length*28+65)+'px';addChart(grid,sec,rankOption(valid,unit));
  }
}
function showScatter(datasets){
  if(datasets.length<2){$('#results').innerHTML=empty(t('emptyWorkspace'),t('compareHint'));return;}
  const x=datasets[state.xIndex||0],y=datasets[state.yIndex??1];
  const points=state.countries.map(iso=>({iso,name:countryLabel(iso),x:D.at(x.data[iso],state.year),y:D.at(y.data[iso],state.year)})).filter(p=>D.isNumber(p.x)&&D.isNumber(p.y));
  currentRows=points.map(p=>({iso3:p.iso,country:p.name,year:state.year,x_indicator:label(x.meta),x_value:p.x,x_unit:x.meta.unit,x_source:catalog.sources[x.meta.source]?.name,y_indicator:label(y.meta),y_value:p.y,y_unit:y.meta.unit,y_source:catalog.sources[y.meta.source]?.name}));
  $('#results').innerHTML=resultHeader(points.length,`${state.year} · ${t('scatterNote')}`)+`<div class="chart-grid single" id="chart-grid"></div>`;
  const sec=chartSection(`${label(y.meta)} × ${label(x.meta)}`,'','',`${t('xAxis')}: ${label(x.meta)} · ${t('yAxis')}: ${label(y.meta)}`,true);
  if(!points.length){sec.element.innerHTML=empty();$('#chart-grid').append(sec.node);}else addChart($('#chart-grid'),sec,scatterOption(points,x.meta,y.meta));
}

async function showComposition(version){
  if(state.topic==='workbench'){await showWorkspaceComposition(version);return;}
  const kind=state.topic==='composition'?state.classification:state.topic==='partners'?'partners':state.serviceMode==='partners'?'servicepartners':'services';
  const years=state.compositionYears==='both'?[...new Set([state.start,state.end])]:[state.year];
  const comps=await Promise.all(state.countries.flatMap(iso=>years.map(year=>D.getComposition(kind,iso,year,state.flow,state.serviceCategory))));
  if(version!==renderVersion)return;
  const measure=state.topic==='partners'?state.partnerMeasure:state.measure,unit=measure==='share'?'%':measure==='gdp'?'% of GDP':measure==='percap'?'USD/person':'USD';
  currentRows=comps.flatMap(c=>D.compositionValues(c,measure,0).map(r=>({iso3:c.iso,country:countryLabel(c.iso),year:c.year,flow:c.flow,category:r.name,category_code:r.id,value:r.value,unit,amount_usd:r.raw,denominator_usd:c.total,source:catalog.sources[c.source]?.name,total_method:c.note||'',source_url:catalog.sources[c.source]?.url})));
  currentDatasets=[];
  const hasIncomplete=comps.some(c=>c.items.length&&(c.coverage===null||Math.abs(c.coverage-100)>0.05));
  $('#results').innerHTML=resultHeader(currentRows.length,years.join(' / '))+((kind==='services'||kind==='servicepartners')&&hasIncomplete?`<div class="notice warning">${t('partial')} · ${t('bitsNote')}</div>`:'')+`<div class="chart-grid ${comps.length===1?'single':''}" id="chart-grid"></div>`;
  const grid=$('#chart-grid');
  if(comps.length>6){
    grid.classList.add('single');
    // Choose the same displayed categories for every country; each country retains its own denominator.
    const totals=new Map(),defs=new Map();for(const c of comps)for(const r of c.items){totals.set(r.id,(totals.get(r.id)||0)+r.value);defs.set(r.id,r);}
    const keys=[...totals].sort((a,b)=>b[1]-a[1]).slice(0,state.topN||999).map(x=>x[0]);
    const cats=keys.map(k=>defs.get(k));if([...defs.keys()].some(k=>!keys.includes(k)))cats.push({id:'__other',name:'Other'});
    const groups=comps.filter(c=>c.items.length).map(c=>{const values=D.compositionValues(c,measure,0);return {name:`${countryLabel(c.iso)}${years.length>1?' '+c.year:''}`,items:[...values.filter(r=>keys.includes(r.id)),{id:'__other',value:values.filter(r=>!keys.includes(r.id)).reduce((s,r)=>s+(r.value??0),0)}]};});
    if(!groups.length){grid.innerHTML=empty();}else{const sec=chartSection(t('compositionCountry'),unit,comps[0]?.source,t('zeroNote'),true);sec.element.style.height=Math.max(370,groups.length*29+95)+'px';addChart(grid,sec,stackedOption(groups,cats,unit));}
  }else for(const comp of comps){
    const items=D.compositionValues(comp,measure,state.topN).filter(r=>D.isNumber(r.value));
    const note=`${comp.sum===null?'':`${t('recorded')}: ${compact(comp.sum)} USD · `}${comp.coverage!==null?`${t('coverage')}: ${num(comp.coverage,1)}%`:t('partial')}${comp.note?' · '+comp.note:''}`;
    const sec=chartSection(`${countryLabel(comp.iso)} · ${comp.year}`,unit,comp.source,note,comps.length===1);
    if(!items.length){sec.element.innerHTML=empty();grid.append(sec.node);continue;}
    sec.element.style.height=Math.max(310,items.length*29+65)+'px';const chart=addChart(grid,sec,compositionOption(items,unit));
    chart.on('click',p=>{const item=items[p.dataIndex];if(item?.spec)addComparison(item.spec);});
  }
  $('#metadata').innerHTML=`<details class="source-details"><summary>${t('sourceDetails')}</summary><div class="source-list"><div class="source-item"><b>${esc(catalog.sources[comps[0]?.source||'baci'].name)}</b>${esc(catalog.sources[comps[0]?.source||'baci'].note)}<p>Shares use the full country-year-flow trade total, or the selected parent service category. Categories outside the top N remain in Other.</p></div></div></details>`;
  icons();
}

function compositionLabel(s){const title=s.kind==='stage'?t('stage'):s.kind==='technology'?t('technology'):s.kind==='hs2'?t('hs2'):s.kind==='partners'?t('partners'):s.kind==='servicepartners'?t('servicePartners'):t('serviceTotals');return `${title} · ${t(s.flow)}${s.kind.startsWith('service')?' · '+label(catalog.categories.services[s.parent]||{name:s.parent}):''}`;}
function currentComposition(){return {kind:state.topic==='composition'?state.classification:state.topic==='partners'?'partners':state.serviceMode==='partners'?'servicepartners':'services',flow:state.flow,parent:state.serviceCategory,measure:state.topic==='partners'?state.partnerMeasure:state.measure};}
async function showWorkspaceComposition(version){
  const years=state.compositionYears==='both'?[...new Set([state.start,state.end])]:[state.year];
  const cases=state.compareCompositions.flatMap(s=>state.countries.flatMap(iso=>years.map(year=>({s,iso,year}))));
  const values=await Promise.all(cases.map(async c=>({...c,comp:await D.getComposition(c.s.kind,c.iso,c.year,c.s.flow,c.s.parent)})));
  if(version!==renderVersion)return;
  currentRows=[];currentDatasets=[];
  $('#results').innerHTML=`<div class="countline"><span>${state.compareCompositions.length} ${t('composition')} · ${years.join(' / ')}</span>${button('download',t('download'),'download','text-button')}</div><div class="chart-grid ${values.length===1?'single':''}" id="chart-grid"></div>`;
  const grid=$('#chart-grid');
  for(const {s,iso,year,comp}of values){
    const unit=s.measure==='share'?'%':s.measure==='gdp'?'% of GDP':s.measure==='percap'?'USD/person':'USD';
    const full=D.compositionValues(comp,s.measure,0),items=D.compositionValues(comp,s.measure,state.topN).filter(x=>D.isNumber(x.value));
    currentRows.push(...full.map(r=>({country:countryLabel(iso),iso3:iso,year,composition:compositionLabel(s),category:r.name,value:r.value,unit,amount_usd:r.raw,denominator_usd:comp.total,source:catalog.sources[comp.source]?.name,source_url:catalog.sources[comp.source]?.url})));
    const sec=chartSection(`${countryLabel(iso)} · ${compositionLabel(s)} · ${year}`,unit,comp.source,`${t('coverage')}: ${num(comp.coverage,1)}% · ${comp.note||t('zeroNote')}`);
    if(!items.length){sec.element.innerHTML=empty();grid.append(sec.node);continue;}
    sec.element.style.height=Math.max(300,items.length*28+65)+'px';addChart(grid,sec,compositionOption(items,unit));
  }
  $('#metadata').innerHTML=`<div class="notice">${t('sourceWarning')} ${t('bitsNote')}</div>`;icons();
}

function showTable(datasets){
  if(state.tableLayout==='matrix'){
    currentRows=state.countries.map(iso=>{const row={iso3:iso,country:countryLabel(iso)};for(const {meta,data}of datasets){const o=D.observation(data[iso],state.latest?state.end:state.year,state.latest,state.start);const name=label(meta)+' ['+unitLabel(meta.unit)+']';row[name]=o.value;row[name+' year']=o.year;}return row;});
  }else currentRows=buildRows(datasets);
  tablePage=0;tableSearch='';tableSort=null;
  tableColumns=state.tableLayout==='matrix'?Object.keys(currentRows[0]||{}):['country','year','indicator','value','unit','source'];
  $('#results').innerHTML=`<div class="table-toolbar"><input id="table-search" type="search" placeholder="${esc(t('searchTable'))}"><small>${t('fullValues')}</small>${button('download',t('download'),'download','text-button')}</div><div id="data-table"></div>`;renderTable();
}
const columnLabels=()=>({country:t('country'),iso3:'ISO3',year:t('year'),indicator:t('indicator'),value:t('value'),unit:t('unit'),source:t('source')});
function renderTable(){
  let rows=currentRows.filter(r=>!tableSearch||Object.values(r).some(v=>String(v??'').toLowerCase().includes(tableSearch.toLowerCase())));
  if(tableSort)rows=[...rows].sort((a,b)=>{const x=a[tableSort.key],y=b[tableSort.key];if(x===null||x===undefined)return 1;if(y===null||y===undefined)return -1;return tableSort.direction*(typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y)));});
  const size=50,pages=Math.max(1,Math.ceil(rows.length/size));tablePage=Math.min(tablePage,pages-1);const slice=rows.slice(tablePage*size,(tablePage+1)*size),labels=columnLabels();
  $('#data-table').innerHTML=`<div class="table-wrap"><table><thead><tr>${tableColumns.map((c,i)=>`<th class="sortable ${['country','indicator','source'].includes(c)?'text':''}" data-column="${i}">${esc(labels[c]||c)}${tableSort?.key===c?(tableSort.direction===1?' ↑':' ↓'):''}</th>`).join('')}</tr></thead><tbody>${slice.map(row=>`<tr>${tableColumns.map(c=>`<td class="${['country','indicator','source'].includes(c)?'text ':''}${row[c]===null||row[c]===undefined?'missing':''}" title="${esc(row[c]??t('missing'))}">${typeof row[c]==='number'?num(row[c],c==='year'?0:4):esc(row[c]??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table>${slice.length?'':empty()}</div><div class="pager"><span>${num(rows.length,0)} ${t('records')} · ${tablePage+1}/${pages}</span>${iconButton('page-prev',t('previous'),'chevron-left',tablePage?'':'disabled')}${iconButton('page-next',t('next'),'chevron-right',tablePage+1<pages?'':'disabled')}</div>`;icons();
}
function metadata(datasets){
  $('#metadata').innerHTML=`<details class="source-details"><summary>${t('sourceDetails')}</summary><div class="source-list">${datasets.map(({meta,data})=>{const values=Object.values(data).flat().filter(p=>D.isNumber(p[1])),years=values.map(p=>p[0]);return `<div class="source-item"><b>${esc(label(meta))}</b><p>${esc(unitLabel(meta.unit))} · ${esc(catalog.sources[meta.source]?.name||'')}</p><p>${esc(meta.note||'')}</p><p>${t('coverage')}: ${years.length?`${Math.min(...years)}–${Math.max(...years)}`:'—'} · ${num(values.length,0)} ${t('observations')}</p>${meta.code?`<p><code>${esc(meta.code)}</code></p>`:''}<a href="${esc(catalog.sources[meta.source]?.url||'#')}" target="_blank" rel="noopener">${t('browseSource')} ${icon('arrow-up-right')}</a></div>`;}).join('')}</div></details>`;
}
function sourcesPage(){
  currentRows=[];currentDatasets=[];$('#metadata').innerHTML='';
  $('#results').innerHTML=`<div class="sources-page"><h2>${t('sourceList')}</h2>${Object.values(catalog.sources).map(s=>`<div class="source-block"><div><h3><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} ${icon('arrow-up-right')}</a></h3></div><p>${esc(s.note)}</p></div>`).join('')}<h2>${t('dataDictionary')}</h2><div class="table-toolbar"><input type="search" id="dictionary-search" placeholder="${esc(t('searchPlaceholder'))}">${button('dictionary-csv',t('download'),'download')}</div><div id="dictionary"></div><h2>${t('allDownloads')}</h2><p class="module-note">${t('sourceLicence')}</p><div class="file-list">${catalog.downloads.map(f=>`<a class="file-link" href="${esc(f.path)}" download><span>${esc(f.name)}</span><small>${num(f.bytes/1024/1024,2)} MB ${icon('download')}</small></a>`).join('')}</div></div>`;
  renderDictionary('');
}
function renderDictionary(query){const ms=catalog.indicators.filter(m=>`${m.name} ${m.zh} ${m.id} ${m.code}`.toLowerCase().includes(query.toLowerCase()));$('#dictionary').innerHTML=`<div class="table-wrap"><table class="coverage-table"><thead><tr><th class="text">${t('indicator')}</th><th>${t('unit')}</th><th>${t('source')}</th><th>${t('sourceYears')}</th><th>${t('countries')}</th></tr></thead><tbody>${ms.map(m=>`<tr><td class="text">${esc(label(m))}<small style="display:block;color:var(--muted)">${esc(m.code||m.id)}</small></td><td>${esc(unitLabel(m.unit))}</td><td>${esc(catalog.sources[m.source]?.name||m.source)}</td><td>${m.years[0]??'—'}–${m.years.at(-1)??'—'}</td><td>${m.countries}/20</td></tr>`).join('')}</tbody></table></div>`;}

async function render(){
  state.language=language;
  const version=++renderVersion;disposeCharts();chartMap.clear();nav();heading();filters();moduleControls();viewControls();saveState();icons();
  if(state.topic==='sources'){sourcesPage();icons();return;}
  $('#results').innerHTML=`<div class="loading"><span class="spinner"></span>${t('loading')}</div>`;$('#metadata').innerHTML='';
  try{
    if(state.view==='topProducts'){await showTopProducts(version);return;}
    if(state.view==='valueQuantity'){await showValueQuantity(version);return;}
    if(state.view==='composition'){await showComposition(version);return;}
    const specs=activeSpecs();
    if(!specs.length){$('#results').innerHTML=empty(state.topic==='products'?t('selectProduct'):t('emptyWorkspace'),t('compareHint'));icons();return;}
    const datasets=await Promise.all(specs.map(async spec=>({meta:D.describe(spec),data:await D.getSeries(spec,state.countries)})));
    if(version!==renderVersion)return;currentDatasets=datasets;
    if(state.view==='trend')showTrends(datasets);else if(state.view==='ranking')showRanking(datasets);else if(state.view==='change')showChange(datasets);else if(state.view==='scatter')showScatter(datasets);else showTable(datasets);
    metadata(datasets);icons();
  }catch(error){if(version!==renderVersion)return;console.error(error);$('#results').innerHTML=empty(t('unexpected'),String(error.message))+button('retry',t('retry'),'rotate-ccw');icons();}
}

function addComparison(spec){
  if(!validSpec(spec))return;
  if(state.compare.some(s=>D.keyOf(s)===D.keyOf(spec))){toast(t('alreadyAdded'));return;}
  state.compare.push(structuredClone(spec));saveState();nav();icons();toast(t('added'));
}
function showCatalog(){catalogQuery='';catalogTopic='all';$('#catalog-content').innerHTML=`<div class="dialog-head"><h2>${t('chooseIndicator')}</h2>${iconButton('close-catalog',t('close'),'x')}</div><div class="dialog-filter"><input id="catalog-search" type="search" placeholder="${esc(t('searchPlaceholder'))}">${select('catalog-topic',[['all',t('allTopics')],...catalog.topics.map(x=>[x.id,label(x)])],'all')}</div><div class="catalog-list" id="catalog-list"></div><div class="dialog-foot"><span>${catalog.indicators.length} ${t('indicators')}</span>${button('open-workbench',t('openWorkbench'),'columns-2','primary')}</div>`;renderCatalog();$('#catalog-dialog').showModal();$('#catalog-search').focus();icons();}
function renderCatalog(){
  const terms=catalogQuery.toLowerCase().split(/\s+/).filter(Boolean),ms=catalog.indicators.filter(m=>(catalogTopic==='all'||m.topic===catalogTopic)&&terms.every(term=>`${m.name} ${m.zh} ${m.id} ${m.code} ${m.unit} ${catalog.sources[m.source]?.name}`.toLowerCase().includes(term)));
  $('#catalog-list').innerHTML=ms.map(m=>{const active=state.compare.some(s=>s.type==='indicator'&&s.id===m.id);return `<div class="catalog-item"><div class="catalog-text">${esc(label(m))}<small>${esc(unitLabel(m.unit))} · ${esc(catalog.sources[m.source]?.name)} · ${m.years[0]??'—'}–${m.years.at(-1)??'—'} · ${m.countries}/20 ${t('countries')}</small></div>${iconButton('catalog-add',active?t('alreadyAdded'):t('addCompare'),active?'check':'plus',`data-id="${esc(m.id)}" ${active?'disabled':''}`)}</div>`;}).join('')||empty();icons();
}
function showCountries(){countryDraft=[...state.countries];$('#country-content').innerHTML=`<div class="dialog-head"><h2>${t('countries')}</h2>${iconButton('close-countries',t('close'),'x')}</div><div class="dialog-filter"><input id="country-search" type="search" placeholder="${esc(t('countrySearch'))}">${button('countries-all',t('all'),'check-check')}${button('countries-clear',t('clear'),'x')}</div><div class="country-groups" id="country-groups"></div><div class="dialog-foot"><span id="country-draft-count"></span>${button('countries-apply',t('apply'),'check','primary')}</div>`;renderCountries('');$('#country-dialog').showModal();icons();}
function renderCountries(query=''){
  const groups=[...new Set(catalog.countries.map(c=>c.region))];$('#country-groups').innerHTML=groups.map(region=>{const cs=catalog.countries.filter(c=>c.region===region&&`${c.id} ${c.name} ${c.zh}`.toLowerCase().includes(query.toLowerCase()));return cs.length?`<div><div class="country-group-head"><h3>${esc(regionLabel(region))}</h3>${button('country-region',t('all'),null,'text-button',`data-region="${esc(region)}"`)}</div>${cs.map(c=>`<label class="country-check"><input type="checkbox" data-country="${c.id}" ${countryDraft.includes(c.id)?'checked':''}><span>${esc(label(c))}</span><small class="country-code">${c.id}</small></label>`).join('')}</div>`:'';}).join('');$('#country-draft-count').textContent=`${countryDraft.length}/20 ${t('selected')}`;icons();
}
async function renderProductSearch(){
  if(!$('#product-results'))return;
  await D.loadProducts();const n=Number(state.productLevel),query=productQuery.toLowerCase().trim();
  const codes=n===2?Object.keys(D.HS2):[...new Set(Object.keys(D.products).map(c=>c.slice(0,n)))].sort();
  const matches=codes.filter(c=>!state.productCodes.includes(c)&&(!query||`${c} ${D.productName(c)} ${D.productName(c,'zh')}`.toLowerCase().includes(query))).slice(0,30);
  if(state.topic!=='products'||!$('#product-results'))return;
  $('#product-results').innerHTML=(query||!state.productCodes.length)?`<div class="product-search-results">${matches.map(c=>`<button class="product-result" data-action="add-product" data-code="${c}"><span><code>${c}</code>${esc(D.productName(c,language))}</span>${icon('plus')}</button>`).join('')||`<div style="padding:10px">${t('noData')}</div>`}</div>`:'';icons();
}
function csvEscape(v){const s=v===null||v===undefined?'':String(v);const safe=/^[=+@]/.test(s)&&typeof v!=='number'?"'"+s:s;return /[",\n\r]/.test(safe)?'"'+safe.replaceAll('"','""')+'"':safe;}
function downloadRows(rows,name){if(!rows.length){toast(t('noData'));return;}const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];const csv='\ufeff'+keys.map(csvEscape).join(',')+'\r\n'+rows.map(r=>keys.map(k=>csvEscape(r[k])).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function gotoTopic(topic){
  state.topic=topic;state.transform='original';state.latest=false;tableSearch='';productQuery='';
  if(defaults[topic])state.metric=defaults[topic];
  state.view=['composition','partners','services'].includes(topic)?'composition':'trend';
  $('#sidebar').classList.remove('open');render();
}

document.addEventListener('click',async event=>{
  const navButton=event.target.closest('[data-topic]');if(navButton){gotoTopic(navButton.dataset.topic);return;}
  const view=event.target.closest('[data-view]');if(view){state.view=view.dataset.view;state.transform='original';render();return;}
  const sortable=event.target.closest('[data-column]');if(sortable){const key=tableColumns[Number(sortable.dataset.column)];tableSort={key,direction:tableSort?.key===key?-tableSort.direction:1};renderTable();return;}
  const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
  const action=target.dataset.action;
  if(action==='countries')showCountries();
  else if(action==='countries-all'){countryDraft=catalog.countries.map(c=>c.id);renderCountries($('#country-search').value);}
  else if(action==='countries-clear'){countryDraft=[];renderCountries($('#country-search').value);}
  else if(action==='country-region'){countryDraft=[...new Set([...countryDraft,...catalog.countries.filter(c=>c.region===target.dataset.region).map(c=>c.id)])];renderCountries($('#country-search').value);}
  else if(action==='countries-apply'){if(!countryDraft.length){toast('Select at least one country');return;}state.countries=catalog.countries.filter(c=>countryDraft.includes(c.id)).map(c=>c.id);$('#country-dialog').close();render();}
  else if(action==='close-countries')$('#country-dialog').close();
  else if(action==='catalog')showCatalog();
  else if(action==='close-catalog')$('#catalog-dialog').close();
  else if(action==='catalog-add'){addComparison(specOf(target.dataset.id));renderCatalog();}
  else if(action==='open-workbench'){$('#catalog-dialog').close();gotoTopic('workbench');}
  else if(action==='add-current'){for(const spec of activeSpecs())addComparison(spec);}
  else if(action==='remove-compare'){state.compare.splice(Number(target.dataset.index),1);render();}
  else if(action==='add-composition'){const spec=currentComposition();if(!state.compareCompositions.some(s=>D.keyOf(s)===D.keyOf(spec)))state.compareCompositions.push(spec);saveState();toast(t('added'));}
  else if(action==='remove-composition'){state.compareCompositions.splice(Number(target.dataset.index),1);render();}
  else if(action==='add-product'){state.productCodes=D.canonicalCodes([...state.productCodes,target.dataset.code]);productQuery='';render();}
  else if(action==='remove-product'){state.productCodes=state.productCodes.filter(c=>c!==target.dataset.code);render();}
  else if(action==='page-prev'){tablePage--;renderTable();}
  else if(action==='page-next'){tablePage++;renderTable();}
  else if(action==='download')downloadRows(currentRows,`trade-data-${state.topic}-${state.view}-${state.start}-${state.end}.csv`);
  else if(action==='dictionary-csv')downloadRows(catalog.indicators.map(m=>({...m,years:m.years.join(';'),source_name:catalog.sources[m.source]?.name,source_url:catalog.sources[m.source]?.url})),'trade-indicator-dictionary.csv');
  else if(action==='share'){saveState();try{await navigator.clipboard.writeText(location.href);toast(t('copied'));}catch{window.prompt(t('share'),location.href);}}
  else if(action==='focus'){document.body.classList.toggle('focus-mode');setTimeout(()=>window.dispatchEvent(new Event('resize')),50);}
  else if(action==='reset'){state={...structuredClone(DEFAULT),language};render();}
  else if(action==='retry')render();
  else if(action==='export-png'||action==='export-svg'){const entry=chartMap.get(target.dataset.chart);if(entry)await exportChart(entry.chart,action.endsWith('svg')?'svg':'png',entry.title.replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,100));}
});
document.addEventListener('change',event=>{
  const el=event.target,id=el.id;if(el.dataset.country){countryDraft=el.checked?[...new Set([...countryDraft,el.dataset.country])]:countryDraft.filter(c=>c!==el.dataset.country);$('#country-draft-count').textContent=`${countryDraft.length}/20 ${t('selected')}`;return;}
  if(id==='catalog-topic'){catalogTopic=el.value;renderCatalog();return;}
  const mapping={'start-year':'start','end-year':'end','reference-year':'year','base-year':'baseYear',metric:'metric',flow:'flow',classification:'classification',category:'category',measure:'measure','product-level':'productLevel','product-measure':'productMeasure',partner:'partner','partner-measure':'partnerMeasure','service-mode':'serviceMode','service-category':'serviceCategory','service-partner':'servicePartner',layout:'layout',transform:'transform',latest:'latest','change-kind':'changeKind','table-layout':'tableLayout','top-n':'topN','composition-years':'compositionYears','x-index':'xIndex','y-index':'yIndex'};
  if(!mapping[id])return;const key=mapping[id];state[key]=el.type==='checkbox'?el.checked:['start','end','year','baseYear','topN','xIndex','yIndex'].includes(key)?Number(el.value):el.value;
  if(id==='start-year'&&state.start>state.end)state.end=state.start;if(id==='end-year'&&state.end<state.start)state.start=state.end;
  if(id==='service-mode'&&state.serviceMode==='wdi'){state.metric='service_exports_current_usd';state.view='trend';}
  if(id==='product-level'){productQuery='';}
  if(id==='classification'&&state.classification==='light')state.view='trend';
  render();
});
document.addEventListener('input',event=>{const el=event.target;if(el.id==='catalog-search'){catalogQuery=el.value;renderCatalog();}else if(el.id==='country-search')renderCountries(el.value);else if(el.id==='product-search'){productQuery=el.value;renderProductSearch();}else if(el.id==='table-search'){tableSearch=el.value;tablePage=0;renderTable();}else if(el.id==='dictionary-search')renderDictionary(el.value);});
$('#global-search').addEventListener('click',showCatalog);$('#menu-toggle').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
window.addEventListener('hashchange',()=>{loadState();render();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#sidebar').classList.remove('open');document.body.classList.remove('focus-mode');}});

try{catalog=await D.initialize();loadState();await D.loadProducts();await render();window.tradeExplorer={getState:()=>structuredClone(state),getRows:()=>structuredClone(currentRows),getDatasets:()=>currentDatasets,setState:async patch=>{state={...state,...patch};setLanguage(state.language);await render();},data:D};}catch(error){console.error(error);$('#results').innerHTML=empty('Unable to load the data snapshot',String(error.message));}

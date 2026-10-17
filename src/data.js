export let catalog,series,products,partnerNames,goodsTotals,hsLabels;
const cache=new Map();
let baseURL=new URL('../',import.meta.url);
export function setBaseURL(url){baseURL=new URL(url);cache.clear();}
export async function readData(name){
  const url=new URL('data/'+name,baseURL);
  if(['catalog.json','series.json','partner-names.json','partners.json.gz'].includes(name))url.searchParams.set('v','partners-en-20261016');
  if(!cache.has(name))cache.set(name,fetch(url).then(async r=>{
    if(!r.ok)throw new Error(`${name}: ${r.status}`);
    if(name.endsWith('.gz'))return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();
    return r.json();
  }).catch(e=>{cache.delete(name);throw e;}));
  return cache.get(name);
}
export async function initialize(){
  [catalog,series,partnerNames,goodsTotals,hsLabels]=await Promise.all(['catalog.json','series.json','partner-names.json','goods-totals.json','hs-labels.json'].map(readData));
  return catalog;
}
export async function loadProducts(){products ||= await readData('products.json');return products;}
export const keyOf=spec=>JSON.stringify(spec);
export const metaById=id=>catalog.indicators.find(m=>m.id===id);
export const countryById=id=>catalog.countries.find(c=>c.id===id);
export const isNumber=v=>typeof v==='number'&&Number.isFinite(v);
export function ratio(n,d,scale=100){return isNumber(n)&&isNumber(d)&&d>0?n/d*scale:null;}
export function at(points,year){return points?.find(p=>p[0]===Number(year))?.[1]??null;}
export function observation(points,year,latest=false,start=2000){
  if(!latest)return {year:Number(year),value:at(points,year)};
  const p=(points||[]).filter(p=>p[0]>=start&&p[0]<=year&&isNumber(p[1])).at(-1);
  return p?{year:p[0],value:p[1]}:{year:null,value:null};
}
export function changeValue(start,end,kind='difference'){
  if(!isNumber(start)||!isNumber(end))return null;
  if(kind==='growth')return start>0&&end>=0?(end/start-1)*100:null;
  return end-start;
}
export function transformPoints(points,mode,baseYear,unit,iso){
  if(mode==='gdp'||mode==='percap'){
    if(unit!=='USD')return [];
    return points.map(([y,v])=>[y,scaleValue(v,mode,iso,y,null)]);
  }
  if(mode==='rebase'){
    if(unit?.startsWith('%')||unit==='index (0-1)')return [];
    const b=at(points,baseYear);
    return b>0?points.map(([y,v])=>[y,isNumber(v)&&v>=0?v/b*100:null]):[];
  }
  if(mode==='cumulative'){
    if(unit!=='USD')return [];
    let total=0;
    return points.map(([y,v])=>[y,isNumber(v)?(total+=v):null]);
  }
  return points;
}
export function canonicalCodes(codes){return [...new Set(codes)].sort((a,b)=>a.length-b.length||a.localeCompare(b)).filter((c,i,a)=>!a.slice(0,i).some(parent=>c.startsWith(parent)));}
export const HS2={
  "10": [
    "Cereals"
  ],
  "11": [
    "Milling products"
  ],
  "12": [
    "Oil seeds"
  ],
  "13": [
    "Gums, resins & plant extracts"
  ],
  "14": [
    "Other vegetable materials"
  ],
  "15": [
    "Fats & oils"
  ],
  "16": [
    "Prepared meat & fish"
  ],
  "17": [
    "Sugar & confectionery"
  ],
  "18": [
    "Cocoa"
  ],
  "19": [
    "Cereal preparations"
  ],
  "20": [
    "Prepared vegetables & fruit"
  ],
  "21": [
    "Other food preparations"
  ],
  "22": [
    "Beverages & vinegar"
  ],
  "23": [
    "Food residues & animal feed"
  ],
  "24": [
    "Tobacco"
  ],
  "25": [
    "Salt, sulphur, stone & cement"
  ],
  "26": [
    "Ores, slag & ash"
  ],
  "27": [
    "Mineral fuels & oils"
  ],
  "28": [
    "Inorganic chemicals"
  ],
  "29": [
    "Organic chemicals"
  ],
  "30": [
    "Pharmaceuticals"
  ],
  "31": [
    "Fertilizers"
  ],
  "32": [
    "Dyes, paints & inks"
  ],
  "33": [
    "Essential oils & cosmetics"
  ],
  "34": [
    "Soap & cleaning preparations"
  ],
  "35": [
    "Albuminoids, starches & glues"
  ],
  "36": [
    "Explosives & matches"
  ],
  "37": [
    "Photographic goods"
  ],
  "38": [
    "Other chemical products"
  ],
  "39": [
    "Plastics"
  ],
  "40": [
    "Rubber"
  ],
  "41": [
    "Hides, skins & leather"
  ],
  "42": [
    "Leather goods & luggage"
  ],
  "43": [
    "Furskins & artificial fur"
  ],
  "44": [
    "Wood"
  ],
  "45": [
    "Cork"
  ],
  "46": [
    "Plaiting materials & basketware"
  ],
  "47": [
    "Pulp & recovered paper"
  ],
  "48": [
    "Paper & paperboard"
  ],
  "49": [
    "Printed books & newspapers"
  ],
  "50": [
    "Silk"
  ],
  "51": [
    "Wool & animal hair"
  ],
  "52": [
    "Cotton"
  ],
  "53": [
    "Other vegetable textile fibres"
  ],
  "54": [
    "Man-made filaments"
  ],
  "55": [
    "Man-made staple fibres"
  ],
  "56": [
    "Wadding, felt & nonwovens"
  ],
  "57": [
    "Carpets"
  ],
  "58": [
    "Special woven fabrics"
  ],
  "59": [
    "Coated & industrial textiles"
  ],
  "60": [
    "Knitted fabrics"
  ],
  "61": [
    "Knitted apparel"
  ],
  "62": [
    "Woven apparel"
  ],
  "63": [
    "Other made-up textiles"
  ],
  "64": [
    "Footwear"
  ],
  "65": [
    "Headgear"
  ],
  "66": [
    "Umbrellas & walking sticks"
  ],
  "67": [
    "Feathers, artificial flowers & hair"
  ],
  "68": [
    "Articles of stone & cement"
  ],
  "69": [
    "Ceramic products"
  ],
  "70": [
    "Glass"
  ],
  "71": [
    "Precious stones & metals"
  ],
  "72": [
    "Iron & steel"
  ],
  "73": [
    "Articles of iron & steel"
  ],
  "74": [
    "Copper"
  ],
  "75": [
    "Nickel"
  ],
  "76": [
    "Aluminium"
  ],
  "78": [
    "Lead"
  ],
  "79": [
    "Zinc"
  ],
  "80": [
    "Tin"
  ],
  "81": [
    "Other base metals"
  ],
  "82": [
    "Tools & cutlery"
  ],
  "83": [
    "Other base-metal articles"
  ],
  "84": [
    "Machinery"
  ],
  "85": [
    "Electrical equipment"
  ],
  "86": [
    "Railway equipment"
  ],
  "87": [
    "Vehicles"
  ],
  "88": [
    "Aircraft"
  ],
  "89": [
    "Ships & boats"
  ],
  "90": [
    "Optical & medical instruments"
  ],
  "91": [
    "Clocks & watches"
  ],
  "92": [
    "Musical instruments"
  ],
  "93": [
    "Arms & ammunition"
  ],
  "94": [
    "Furniture & lighting"
  ],
  "95": [
    "Toys, games & sports goods"
  ],
  "96": [
    "Miscellaneous manufactured articles"
  ],
  "97": [
    "Works of art & antiques"
  ],
  "99": [
    "Special / unspecified commodities"
  ],
  "01": [
    "Live animals"
  ],
  "02": [
    "Meat"
  ],
  "03": [
    "Fish & seafood"
  ],
  "04": [
    "Dairy, eggs & honey"
  ],
  "05": [
    "Other animal products"
  ],
  "06": [
    "Live plants"
  ],
  "07": [
    "Vegetables"
  ],
  "08": [
    "Fruit & nuts"
  ],
  "09": [
    "Coffee, tea & spices"
  ]
};
export function productName(code,lang='en'){
  if(code.length===2)return hsLabels?.[code]||HS2[code]?.[0]||`HS ${code}`;
  if(hsLabels?.[code])return hsLabels[code];
  if(code.length===6)return products?.[code]?.[0]||`HS ${code}`;
  return `HS ${code}`;
}
export function describe(spec){
  if(spec.type==='indicator')return {...metaById(spec.id),spec};
  const flow=spec.flow||'import';
  const units={value:'USD',share:`% of merchandise ${flow}s`,gdp:'% of GDP',percap:'USD/person',quantity:'tonnes',unit:'USD/tonne',china_value:'USD',china_share:'% of basket imports from China'};
  if(spec.type==='product'){
    const codes=canonicalCodes(spec.codes||[]),names=codes.map(c=>productName(c)).join(' + ');
    return {id:keyOf(spec),name:`${names||'Product basket'} ${flow}s`,topic:'products',source:'baci',unit:units[spec.measure],frequency:'annual',years:catalog.goodsYears,spec,
      note:'Sum of selected non-overlapping HS92 product codes. Shares use all recorded merchandise in the same country-year. A product-year with no recorded observation remains missing. Tonnes and unit value are available only for a single HS6 code. China-origin values are available for imports only.'};
  }
  if(spec.type==='partner'){
    return {id:keyOf(spec),name:`${flow==='import'?'Imports from':'Exports to'} ${partnerNames[spec.partner]||spec.partner}`,topic:'partners',source:'baci',unit:units[spec.measure],frequency:'annual',years:catalog.partnerYears,spec,note:'Annual bilateral merchandise value, 2000-2024. Shares use all recorded partners in the same country-year. No recorded partner observation remains missing. Historical territory definitions follow the source.'};
  }
  if(spec.type==='servicepartner')return {id:keyOf(spec),name:`${catalog.categories.services[spec.category]?.name||spec.category} ${flow}s ${flow==='import'?'from':'to'} ${partnerNames[spec.partner]||spec.partner}`,topic:'services',source:'bits',unit:spec.measure==='share'?`% of service category ${flow}s`:units[spec.measure],frequency:'annual',years:Array.from({length:24},(_,i)=>2000+i),spec,note:'Bilateral service flow. The share denominator is the corresponding BiTS country-category total, not the sum of the displayed partners. Bilateral coverage is incomplete for many country-category-years.'};
  return {id:keyOf(spec),name:'Unknown series',unit:'',spec};
}

function scaleValue(v,measure,iso,year,denom){
  if(measure==='share')return ratio(v,denom);
  if(measure==='gdp')return ratio(v,at(series.gdp_current_usd?.[iso],year));
  if(measure==='percap')return ratio(v,at(series.population?.[iso],year),1);
  return v;
}

export async function getSeries(spec,ids){
  const result={};
  if(spec.type==='indicator')return Object.fromEntries(ids.map(iso=>[iso,series[spec.id]?.[iso]||[]]));
  if(spec.type==='product'){
    const codes=canonicalCodes(spec.codes||[]);
    const single=codes.length===1&&codes[0].length===6;
    if(['unit','quantity'].includes(spec.measure)&&!single)return Object.fromEntries(ids.map(i=>[i,[]]));
    if(['china_value','china_share'].includes(spec.measure)&&spec.flow!=='import')return Object.fromEntries(ids.map(i=>[i,[]]));
    await Promise.all(ids.map(async iso=>{
      const data=await readData(`products/${iso}-${spec.flow}.json.gz`);
      const groups=new Map();
      for(const [y,hs,v,q,ch] of data){
        if(!codes.some(c=>hs.startsWith(c)))continue;
        const g=groups.get(y)||{v:0,q:0,ch:0,qCount:0,chCount:0};g.v+=v;
        if(isNumber(q)){g.q+=q;g.qCount++;}if(isNumber(ch)){g.ch+=ch;g.chCount++;}groups.set(y,g);
      }
      result[iso]=[...groups].sort((a,b)=>a[0]-b[0]).map(([y,g])=>{
        let value=g.v;
        if(spec.measure==='quantity')value=g.qCount?g.q:null;
        else if(spec.measure==='unit')value=g.qCount?ratio(g.v,g.q,1):null;
        else if(spec.measure==='china_value')value=g.chCount?g.ch:null;
        else if(spec.measure==='china_share')value=g.chCount?ratio(g.ch,g.v):null;
        else value=scaleValue(g.v,spec.measure,iso,y,goodsTotals[iso]?.[spec.flow]?.[y]);
        return [y,value];
      });
    }));
  }else if(spec.type==='partner'){
    const data=await readData('partners.json.gz');
    const totals=new Map();
    for(const [iso,y,f,p,v]of data)if(f===spec.flow)totals.set(`${iso}.${y}`,(totals.get(`${iso}.${y}`)||0)+v);
    for(const iso of ids)result[iso]=data.filter(r=>r[0]===iso&&r[2]===spec.flow&&r[3]===spec.partner).map(([,y,,,v])=>[y,scaleValue(v,spec.measure,iso,y,totals.get(`${iso}.${y}`))]).sort((a,b)=>a[0]-b[0]);
  }else if(spec.type==='servicepartner'){
    await Promise.all(ids.map(async iso=>{
      const data=await readData(`services/${iso}.json`),byYear=new Map();
      for(const [y,f,c,p,v]of data)if(f===spec.flow&&c===spec.category&&p===spec.partner)byYear.set(y,(byYear.get(y)||0)+v);
      result[iso]=[...byYear].sort((a,b)=>a[0]-b[0]).map(([y,v])=>[y,scaleValue(v,spec.measure,iso,y,at(series[`bits.${spec.flow}.${spec.category}.value`]?.[iso],y))]);
    }));
  }
  return result;
}

export async function getComposition(kind,iso,year,flow,parent='S'){
  let items=[],total=null,source='baci',note='';
  if(['stage','technology'].includes(kind)){
    const data=await readData('composition.json');
    items=data.filter(r=>r[0]===iso&&r[1]===year&&r[2]===flow&&r[3]===kind).map(r=>({id:r[4],name:r[4],zh:catalog.categories[kind][r[4]]||r[4],value:r[5],spec:{type:'indicator',id:`baci.${flow}.${kind}.${r[4]}.share`}}));
    total=goodsTotals[iso]?.[flow]?.[year]??null;
  }else if(kind==='hs2'){
    const data=await readData(`products/${iso}-${flow}.json.gz`),grouped=new Map();
    for(const [y,hs,v]of data)if(y===year){const key=hs.slice(0,2);grouped.set(key,(grouped.get(key)||0)+v);}
    items=[...grouped].map(([id,value])=>({id,name:productName(id),zh:productName(id,'zh'),value,spec:{type:'product',flow,codes:[id],measure:'share'}}));
    total=goodsTotals[iso]?.[flow]?.[year]??null;
  }else if(kind==='partners'){
    const data=await readData('partners.json.gz');
    items=data.filter(r=>r[0]===iso&&r[1]===year&&r[2]===flow).map(r=>({id:r[3],name:partnerNames[r[3]]||r[3],value:r[4],spec:{type:'partner',flow,partner:r[3],measure:'share'}}));
    total=items.length?items.reduce((s,r)=>s+r.value,0):null;
  }else if(kind==='services'){
    source='bits';
    const data=await readData('services.json');
    const cats=Object.keys(catalog.categories.services).filter(c=>c.startsWith(parent)&&c.length===parent.length+1);
    items=data.filter(r=>r[0]===iso&&r[1]===year&&r[2]===flow&&cats.includes(r[3])).map(r=>({id:r[3],name:catalog.categories.services[r[3]]?.name||r[3],zh:catalog.categories.services[r[3]]?.zh,value:r[4],method:r[5],spec:{type:'indicator',id:`bits.${flow}.${r[3]}.share`}}));
    const row=data.find(r=>r[0]===iso&&r[1]===year&&r[2]===flow&&r[3]===parent);
    total=row?.[4]??null;note=row?.[5]||'';
  }else if(kind==='servicepartners'){
    source='bits';
    const data=await readData(`services/${iso}.json`);
    items=data.filter(r=>r[0]===year&&r[1]===flow&&r[2]===parent&&!r[6]).map(r=>({id:r[3],name:partnerNames[r[3]]||r[3],value:r[4],spec:{type:'servicepartner',flow,category:parent,partner:r[3],measure:'share'}}));
    total=at(series[`bits.${flow}.${parent}.value`]?.[iso],year);
    note='Bilateral partner records may cover only part of the category total.';
  }
  items=items.sort((a,b)=>b.value-a.value);
  const sum=items.length?items.reduce((s,r)=>s+r.value,0):null;
  return {items,total,sum,coverage:ratio(sum,total),source,note,iso,year,flow,kind,parent};
}

export function compositionValues(comp,measure='share',limit=10,selected=[]){
  let items=comp.items.filter(x=>!selected.length||selected.includes(x.id));
  const fullSum=items.length?items.reduce((s,x)=>s+x.value,0):null;
  const denominator=measure==='selected'?fullSum:comp.total;
  if(limit&&items.length>limit){const rest=items.slice(limit);items=items.slice(0,limit).concat({id:'__other',name:'Other',value:rest.reduce((s,x)=>s+x.value,0)});}
  return items.map(item=>({...item,raw:item.value,value:measure==='share'||measure==='selected'?ratio(item.value,denominator):scaleValue(item.value,measure,comp.iso,comp.year,denominator)}));
}
export function coverageFor(meta,ids){
  const data=series[meta.id]||{};
  return ids.map(iso=>{const p=data[iso]||[];return {iso,first:p[0]?.[0]??null,last:p.at(-1)?.[0]??null,n:p.length};});
}

export async function getTopProducts(iso,year,flow,level=6,limit=10){
  const data=await readData(`top-products/${iso}-${flow}.json.gz`);
  return data.filter(r=>r[0]===year&&r[1]===Number(level)&&r[2]<=limit)
    .map(([y,l,rank,code,value,share])=>({iso,year:y,level:l,rank,code,value,share}));
}

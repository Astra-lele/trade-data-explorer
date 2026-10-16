export let catalog,series,products,partnerNames,goodsTotals,hsLabels;
const cache=new Map();
let baseURL=new URL('../',import.meta.url);
export function setBaseURL(url){baseURL=new URL(url);cache.clear();}
export async function readData(name){
  if(!cache.has(name))cache.set(name,fetch(new URL('data/'+name,baseURL)).then(r=>{if(!r.ok)throw new Error(`${name}: ${r.status}`);return r.json();}).catch(e=>{cache.delete(name);throw e;}));
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
 '01':['Live animals','活动物'],'02':['Meat','肉及食用杂碎'],'03':['Fish & seafood','鱼及海产品'],'04':['Dairy, eggs & honey','乳品、蛋及蜂蜜'],'05':['Other animal products','其他动物产品'],'06':['Live plants','活植物'],'07':['Vegetables','蔬菜'],'08':['Fruit & nuts','水果及坚果'],'09':['Coffee, tea & spices','咖啡、茶及香料'],'10':['Cereals','谷物'],'11':['Milling products','制粉产品'],'12':['Oil seeds','油籽'],'13':['Gums, resins & plant extracts','树胶树脂及植物提取物'],'14':['Other vegetable materials','其他植物材料'],'15':['Fats & oils','油脂'],'16':['Prepared meat & fish','肉及鱼制品'],'17':['Sugar & confectionery','糖及糖食'],'18':['Cocoa','可可'],'19':['Cereal preparations','谷物制品'],'20':['Prepared vegetables & fruit','蔬果制品'],'21':['Other food preparations','其他食品'],'22':['Beverages & vinegar','饮料及醋'],'23':['Food residues & animal feed','食品残渣及饲料'],'24':['Tobacco','烟草'],'25':['Salt, sulphur, stone & cement','盐、硫、石料及水泥'],'26':['Ores, slag & ash','矿砂、矿渣及矿灰'],'27':['Mineral fuels & oils','矿物燃料及油'],'28':['Inorganic chemicals','无机化学品'],'29':['Organic chemicals','有机化学品'],'30':['Pharmaceuticals','药品'],'31':['Fertilizers','肥料'],'32':['Dyes, paints & inks','染料、涂料及墨'],'33':['Essential oils & cosmetics','精油及化妆品'],'34':['Soap & cleaning preparations','肥皂及洗涤用品'],'35':['Albuminoids, starches & glues','蛋白类、淀粉及胶'],'36':['Explosives & matches','炸药及火柴'],'37':['Photographic goods','照相用品'],'38':['Other chemical products','其他化学产品'],'39':['Plastics','塑料'],'40':['Rubber','橡胶'],'41':['Hides, skins & leather','生皮及皮革'],'42':['Leather goods & luggage','皮革制品及箱包'],'43':['Furskins & artificial fur','毛皮及人造毛皮'],'44':['Wood','木材及木制品'],'45':['Cork','软木'],'46':['Plaiting materials & basketware','编结材料及编织品'],'47':['Pulp & recovered paper','纸浆及废纸'],'48':['Paper & paperboard','纸及纸板'],'49':['Printed books & newspapers','图书报刊及印刷品'],'50':['Silk','丝'],'51':['Wool & animal hair','羊毛及动物毛'],'52':['Cotton','棉'],'53':['Other vegetable textile fibres','其他植物纤维'],'54':['Man-made filaments','化学纤维长丝'],'55':['Man-made staple fibres','化学纤维短纤'],'56':['Wadding, felt & nonwovens','絮胎、毡及无纺织物'],'57':['Carpets','地毯'],'58':['Special woven fabrics','特殊机织物'],'59':['Coated & industrial textiles','涂层及工业纺织品'],'60':['Knitted fabrics','针织物'],'61':['Knitted apparel','针织服装'],'62':['Woven apparel','非针织服装'],'63':['Other made-up textiles','其他纺织制品'],'64':['Footwear','鞋类'],'65':['Headgear','帽类'],'66':['Umbrellas & walking sticks','伞及手杖'],'67':['Feathers, artificial flowers & hair','羽毛、人造花及发制品'],'68':['Articles of stone & cement','石料及水泥制品'],'69':['Ceramic products','陶瓷产品'],'70':['Glass','玻璃'],'71':['Precious stones & metals','宝石及贵金属'],'72':['Iron & steel','钢铁'],'73':['Articles of iron & steel','钢铁制品'],'74':['Copper','铜'],'75':['Nickel','镍'],'76':['Aluminium','铝'],'78':['Lead','铅'],'79':['Zinc','锌'],'80':['Tin','锡'],'81':['Other base metals','其他贱金属'],'82':['Tools & cutlery','工具及刀具'],'83':['Other base-metal articles','其他贱金属制品'],'84':['Machinery','机械设备'],'85':['Electrical equipment','电气设备'],'86':['Railway equipment','铁路设备'],'87':['Vehicles','车辆'],'88':['Aircraft','航空器'],'89':['Ships & boats','船舶'],'90':['Optical & medical instruments','光学及医疗仪器'],'91':['Clocks & watches','钟表'],'92':['Musical instruments','乐器'],'93':['Arms & ammunition','武器及弹药'],'94':['Furniture & lighting','家具及灯具'],'95':['Toys, games & sports goods','玩具、游戏及体育用品'],'96':['Miscellaneous manufactured articles','杂项制成品'],'97':['Works of art & antiques','艺术品及古董'],'99':['Special / unspecified commodities','特殊或未指定商品']
};
export function productName(code,lang='en'){
  if(code.length===2)return lang==='zh'?(HS2[code]?.[1]||hsLabels?.[code]||`HS ${code}`):(hsLabels?.[code]||HS2[code]?.[0]||`HS ${code}`);
  if(hsLabels?.[code])return hsLabels[code];
  if(code.length===6)return products?.[code]?.[0]||`HS ${code}`;
  return `HS ${code}`;
}
export function describe(spec){
  if(spec.type==='indicator')return {...metaById(spec.id),spec};
  const flow=spec.flow||'import',fzh=flow==='import'?'进口':'出口';
  const units={value:'USD',share:`% of merchandise ${flow}s`,gdp:'% of GDP',percap:'USD/person',quantity:'tonnes',unit:'USD/tonne',china_value:'USD',china_share:'% of basket imports from China'};
  if(spec.type==='product'){
    const codes=canonicalCodes(spec.codes||[]),names=codes.map(c=>productName(c)).join(' + '),zh=codes.map(c=>productName(c,'zh')).join(' + ');
    return {id:keyOf(spec),name:`${names||'Product basket'} ${flow}s`,zh:`${zh||'商品篮子'}${fzh}`,topic:'products',source:'baci',unit:units[spec.measure],frequency:'benchmark',years:catalog.benchmarkYears,spec,
      note:'Sum of selected non-overlapping HS92 product codes. Shares use all recorded merchandise in the same country-year. A product-year with no recorded observation remains missing. Tonnes and unit value are available only for a single HS6 code. China-origin values are available for imports only.'};
  }
  if(spec.type==='partner')return {id:keyOf(spec),name:`${flow==='import'?'Imports from':'Exports to'} ${partnerNames[spec.partner]||spec.partner}`,zh:`${flow==='import'?'来自':'面向'}${partnerNames[spec.partner]||spec.partner}的${fzh}`,topic:'partners',source:'baci',unit:units[spec.measure],frequency:'benchmark',years:catalog.benchmarkYears,spec,note:'Bilateral merchandise value. Shares use all recorded partners in the same country-year. No recorded partner observation remains missing.'};
  if(spec.type==='servicepartner')return {id:keyOf(spec),name:`${catalog.categories.services[spec.category]?.name||spec.category} ${flow}s ${flow==='import'?'from':'to'} ${partnerNames[spec.partner]||spec.partner}`,zh:`${catalog.categories.services[spec.category]?.zh||spec.category}${fzh} · ${partnerNames[spec.partner]||spec.partner}`,topic:'services',source:'bits',unit:spec.measure==='share'?`% of service category ${flow}s`:units[spec.measure],frequency:'annual',years:Array.from({length:24},(_,i)=>2000+i),spec,note:'Bilateral service flow. The share denominator is the corresponding BiTS country-category total, not the sum of the displayed partners. Bilateral coverage is incomplete for many country-category-years.'};
  return {id:keyOf(spec),name:'Unknown series',zh:'未知序列',unit:'',spec};
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
      const data=await readData(`products/${iso}-${spec.flow}.json`);
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
    const data=await readData('partners.json');
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
    const data=await readData(`products/${iso}-${flow}.json`),grouped=new Map();
    for(const [y,hs,v]of data)if(y===year){const key=hs.slice(0,2);grouped.set(key,(grouped.get(key)||0)+v);}
    items=[...grouped].map(([id,value])=>({id,name:productName(id),zh:productName(id,'zh'),value,spec:{type:'product',flow,codes:[id],measure:'share'}}));
    total=goodsTotals[iso]?.[flow]?.[year]??null;
  }else if(kind==='partners'){
    const data=await readData('partners.json');
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
  if(limit&&items.length>limit){const rest=items.slice(limit);items=items.slice(0,limit).concat({id:'__other',name:'Other',zh:'其他',value:rest.reduce((s,x)=>s+x.value,0)});}
  return items.map(item=>({...item,raw:item.value,value:measure==='share'||measure==='selected'?ratio(item.value,denominator):scaleValue(item.value,measure,comp.iso,comp.year,denominator)}));
}
export function coverageFor(meta,ids){
  const data=series[meta.id]||{};
  return ids.map(iso=>{const p=data[iso]||[];return {iso,first:p[0]?.[0]??null,last:p.at(-1)?.[0]??null,n:p.length};});
}

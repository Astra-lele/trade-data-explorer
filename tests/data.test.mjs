import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as D from '../src/data.js';

globalThis.fetch = async url => {
  try { return new Response(await fs.readFile(url)); }
  catch { return {ok:false, status:404}; }
};
await D.initialize();
const close = (a,b) => {assert.ok(Number.isFinite(a)&&Number.isFinite(b));assert.ok(Math.abs(a-b) <= Math.max(1,Math.abs(b))*1e-9, `${a} != ${b}`);};

test('20 countries, 8 topics, unique indicators and sorted finite observations', () => {
  assert.equal(D.catalog.countries.length,20);
  assert.equal(D.catalog.topics.length,8);
  assert.equal(new Set(D.catalog.indicators.map(m=>m.id)).size,D.catalog.indicators.length);
  for(const [id,countries] of Object.entries(D.series)) {
    assert.ok(D.metaById(id), id);
    for(const points of Object.values(countries)) for(let i=0;i<points.length;i++) {
      assert.ok(Number.isFinite(points[i][1]));
      if(i) assert.ok(points[i][0]>points[i-1][0]);
    }
  }
});

test('product, stage and technology totals reconcile in all 1000 annual country-flow-years', async () => {
  for(const {id:iso} of D.catalog.countries) for(const flow of ['import','export']) {
    const rows=await D.readData(`products/${iso}-${flow}.json.gz`);
    const sums=new Map();
    for(const [year,hs,value,quantity,china] of rows) {
      assert.match(hs,/^\d{6}$/);
      assert.ok(value>=0);
      if(quantity!==null) assert.ok(quantity>=0);
      if(china!==null&&china!==undefined) assert.ok(china>=0&&china<=value+1e-5);
      sums.set(year,(sums.get(year)||0)+value);
    }
    assert.deepEqual([...sums.keys()],D.catalog.goodsYears);
    for(const [year,total] of sums) {
      close(total,D.goodsTotals[iso][flow][year]);
      for(const kind of ['stage','technology']) {
        const comp=await D.getComposition(kind,iso,year,flow);
        close(comp.sum,total);
        close(D.compositionValues(comp).reduce((s,r)=>s+r.value,0),100);
      }
    }
  }
});

test('single-product quantities, USD per tonne, and China shares', async () => {
  const spec={type:'product',flow:'import',codes:['610910'],measure:'value'};
  const raw=(await D.readData('products/KEN-import.json.gz')).filter(r=>r[1]==='610910');
  for(const measure of ['value','quantity','unit','china_share']) {
    const values=(await D.getSeries({...spec,measure},['KEN'])).KEN;
    for(const [year,,usd,tonnes,china] of raw) {
      const expected={value:usd,quantity:tonnes,unit:D.ratio(usd,tonnes,1),china_share:D.ratio(china,usd)}[measure];
      if(expected===null) assert.equal(D.at(values,year),null); else close(D.at(values,year),expected);
    }
  }
  assert.deepEqual((await D.getSeries({...spec,codes:['61'],measure:'quantity'},['KEN'])).KEN,[]);
  assert.deepEqual((await D.getSeries({...spec,codes:['610910','620342'],measure:'unit'},['KEN'])).KEN,[]);
  assert.deepEqual((await D.getSeries({...spec,flow:'export',measure:'china_value'},['KEN'])).KEN,[]);
  assert.deepEqual(D.canonicalCodes(['61','610910','62','61']),['61','62']);
});

test('missing data, negative bases, and transformations are not silently fabricated', () => {
  assert.equal(D.ratio(1,0),null);
  assert.equal(D.at([[2000,1]],2001),null);
  assert.deepEqual(D.observation([[2000,1],[2023,2]],2024,false),{year:2024,value:null});
  assert.deepEqual(D.observation([[2000,1],[2023,2]],2024,true),{year:2023,value:2});
  assert.equal(D.changeValue(-2,3,'growth'),null);
  assert.deepEqual(D.transformPoints([[2000,5],[2001,10]],'rebase',2000,'USD','KEN'),[[2000,100],[2001,200]]);
  assert.deepEqual(D.transformPoints([[2000,5]],'rebase',2000,'% of GDP','KEN'),[]);
  assert.deepEqual(D.transformPoints([[2000,5]],'gdp',2000,'% of GDP','KEN'),[]);
});

test('service partner rows are unique and downloads retain their recorded checksums', async () => {
  for(const {id} of D.catalog.countries) {
    const rows=await D.readData(`services/${id}.json`);
    const seen=new Set();
    for(const r of rows) { const key=JSON.stringify(r.slice(0,4)); assert.ok(!seen.has(key),`${id} ${key}`); seen.add(key); }
  }
  const files=await fs.readdir(new URL('../downloads/',import.meta.url));
  assert.equal(files.length,D.catalog.downloads.length);
  for(const item of D.catalog.downloads){
    assert.ok(files.includes(item.name));
    const data=await fs.readFile(new URL('../'+item.path,import.meta.url));
    assert.equal(data.length,item.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'),item.sha256);
  }
});

test('broad light-consumer series and China-origin imports use the annual product universe', async()=>{
  await D.loadProducts();
  assert.equal(D.catalog.indicators.some(m=>m.id.includes('.light.narrow.')),false);
  for(const {id:iso}of D.catalog.countries){
    const raw=await D.readData(`products/${iso}-import.json.gz`),groups=new Map();
    for(const [y,code,value,,china]of raw){
      const group=groups.get(y)||{light:0,lightChina:0,china:0};
      group.china+=china;if(D.products[code][3]){group.light+=value;group.lightChina+=china;}groups.set(y,group);
    }
    const partner=await D.getSeries({type:'partner',flow:'import',partner:'CHN',measure:'share'},[iso]);
    for(const [year,g]of groups){
      const expected={value:g.light,share:D.ratio(g.light,D.goodsTotals[iso].import[year]),
        gdp:D.ratio(g.light,D.at(D.series.gdp_current_usd[iso],year)),
        percap:D.ratio(g.light,D.at(D.series.population[iso],year),1),
        china_value:g.lightChina,china_share:D.ratio(g.lightChina,g.light)};
      for(const [measure,value]of Object.entries(expected)){
        const actual=D.at(D.series[`baci.import.light.broad.${measure}`][iso],year);
        if(value===null)assert.equal(actual,null);else close(actual,value);
      }
      close(D.at(partner[iso],year),D.ratio(g.china,D.goodsTotals[iso].import[year]));
    }
  }
  assert.equal(D.describe({type:'partner',flow:'import',partner:'CHN',measure:'value'}).frequency,'annual');
  assert.equal(D.describe({type:'partner',flow:'export',partner:'CHN',measure:'value'}).frequency,'annual');
});

test('annual partners cover 1000 groups and reconcile with products, China and HHI',async()=>{
  const rows=await D.readData('partners.json.gz');
  assert.equal(rows.length,149043);
  assert.equal(D.catalog.counts.goods_partner_rows,rows.length);
  assert.deepEqual(D.catalog.partnerYears,D.catalog.goodsYears);
  const groups=new Map(),seen=new Set();
  for(const [iso,y,flow,partner,value]of rows){
    const unique=JSON.stringify([iso,y,flow,partner]);assert.ok(!seen.has(unique));seen.add(unique);
    const key=JSON.stringify([iso,y,flow]);const group=groups.get(key)||[];
    group.push({partner,value});groups.set(key,group);
    assert.ok(value>=0&&Number.isFinite(value));assert.ok(D.partnerNames[partner]);
  }
  assert.equal(groups.size,1000);
  for(const [key,items]of groups){
    const [iso,year,flow]=JSON.parse(key),total=items.reduce((s,r)=>s+r.value,0);
    close(total,D.goodsTotals[iso][flow][year]);
    close(D.at(D.series[`baci.${flow}.partner.hhi`][iso],year),items.reduce((s,r)=>s+(r.value/total)**2,0));
    const china=items.find(r=>r.partner==='CHN')?.value||0;
    close(D.at(D.series[`baci.${flow}.china.share`][iso],year),100*china/total);
    const comp=await D.getComposition('partners',iso,year,flow);
    close(comp.sum,total);close(comp.coverage,100);
    close(D.compositionValues(comp,'share',10).reduce((s,r)=>s+r.value,0),100);
  }
  for(const flow of ['import','export'])for(const partner of ['USA','CHN','DEU']){
    const spec={type:'partner',flow,partner,measure:'share'};
    const values=await D.getSeries(spec,['KEN']);
    for(const year of D.catalog.partnerYears){
      const value=groups.get(JSON.stringify(['KEN',year,flow])).find(r=>r.partner===partner)?.value;
      const actual=D.at(values.KEN,year);
      if(value===undefined)assert.equal(actual,null);else close(actual,100*value/D.goodsTotals.KEN[flow][year]);
    }
  }
});

test('public interface and metadata contain English only and locale cannot be switched',async()=>{
  const locale=await import('../src/i18n.js');
  globalThis.document={documentElement:{lang:'zh-CN'}};
  locale.setLanguage('zh');assert.equal(locale.language,'en');assert.equal(document.documentElement.lang,'en');
  assert.equal(locale.label({name:'English',zh:'Chinese'}),'English');
  delete globalThis.document;
  const names=await fs.readdir(new URL('../src/',import.meta.url));
  for(const name of names.filter(n=>n.endsWith('.js'))){
    const content=await fs.readFile(new URL('../src/'+name,import.meta.url),'utf8');
    assert.equal(/\p{Script=Han}/u.test(content),false,name);
  }
  assert.equal(/\p{Script=Han}/u.test(JSON.stringify(D.catalog)),false);
  const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.equal(html.includes('language-toggle'),false);
  assert.equal(D.catalog.language,'en');
});

test('annual HS2/4/6 rankings agree with independently aggregated product records', async()=>{
  for(const {id:iso}of D.catalog.countries)for(const flow of ['import','export']){
    const raw=await D.readData(`products/${iso}-${flow}.json.gz`);
    for(const level of [2,4,6]){
      const groups=new Map();
      for(const [y,code,value]of raw){const key=`${y}.${code.slice(0,level)}`;groups.set(key,(groups.get(key)||0)+value);}
      for(const year of D.catalog.goodsYears){
        const expected=[...groups].filter(([key])=>key.startsWith(year+'.')).map(([key,value])=>({code:key.split('.')[1],value})).sort((a,b)=>b.value-a.value||a.code.localeCompare(b.code)).slice(0,100);
        const ranked=await D.getTopProducts(iso,year,flow,level,100);
        assert.equal(ranked.length,expected.length);
        for(let i=0;i<ranked.length;i++){
          assert.equal(ranked[i].code,expected[i].code);assert.equal(ranked[i].rank,i+1);
          close(ranked[i].value,expected[i].value);close(ranked[i].share,D.ratio(expected[i].value,D.goodsTotals[iso][flow][year]));
        }
      }
    }
  }
});

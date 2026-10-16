import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as D from '../src/data.js';

globalThis.fetch = async url => {
  try { const value = JSON.parse(await fs.readFile(url, 'utf8')); return {ok:true, json:async()=>value}; }
  catch { return {ok:false, status:404}; }
};
await D.initialize();
const close = (a,b) => assert.ok(Math.abs(a-b) <= Math.max(1,Math.abs(b))*1e-9, `${a} != ${b}`);

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

test('product, stage and technology totals reconcile in all 240 country-flow-years', async () => {
  for(const {id:iso} of D.catalog.countries) for(const flow of ['import','export']) {
    const rows=await D.readData(`products/${iso}-${flow}.json`);
    const sums=new Map();
    for(const [year,hs,value,quantity,china] of rows) {
      assert.match(hs,/^\d{6}$/);
      assert.ok(value>=0);
      if(quantity!==null) assert.ok(quantity>=0);
      if(china!==null&&china!==undefined) assert.ok(china>=0&&china<=value+1e-5);
      sums.set(year,(sums.get(year)||0)+value);
    }
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
  const raw=(await D.readData('products/KEN-import.json')).filter(r=>r[1]==='610910');
  for(const measure of ['value','quantity','unit','china_share']) {
    const values=(await D.getSeries({...spec,measure},['KEN'])).KEN;
    for(const [year,,usd,tonnes,china] of raw) {
      const expected={value:usd,quantity:tonnes,unit:D.ratio(usd,tonnes,1),china_share:D.ratio(china,usd)}[measure];
      if(expected===null) assert.equal(D.at(values,year),null); else close(D.at(values,year),expected);
    }
  }
  assert.deepEqual((await D.getSeries({...spec,codes:['61'],measure:'quantity'},['KEN'])).KEN,[]);
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

test('service partner rows are unique and downloads exist', async () => {
  for(const {id} of D.catalog.countries) {
    const rows=await D.readData(`services/${id}.json`);
    const seen=new Set();
    for(const r of rows) { const key=JSON.stringify(r.slice(0,4)); assert.ok(!seen.has(key),`${id} ${key}`); seen.add(key); }
  }
  const files=await fs.readdir(new URL('../downloads/',import.meta.url));
  assert.equal(files.length,19);
});

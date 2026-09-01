import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const data=JSON.parse(fs.readFileSync(new URL('./es-foundation-v1.json',import.meta.url),'utf8'));
const sourceList=JSON.parse(fs.readFileSync(new URL('./es-foundation-v1.sources.json',import.meta.url),'utf8'));
const sources=Object.fromEntries(sourceList.sources.map(x=>[x.key,x]));
const confidence=['VERIFIED','HIGH','MEDIUM','LOW','UNVERIFIED'];
const expected=['tomate','cebolla','ajo','arroz','pollo','limon','garbanzo','leche','huevo','cacahuete','trigo','almendra','aceite_oliva','pimiento','manzana','naranja'];

test('ES-1 canonical cohort is exact and unique',()=>{
  assert.deepEqual(data.ingredients.map(x=>x.key),expected);
  assert.equal(new Set(data.ingredients.map(x=>x.key)).size,data.ingredients.length);
});

test('source registry is internally valid',()=>{
  assert.equal(new Set(sourceList.sources.map(x=>x.key)).size,sourceList.sources.length);
  for(const source of sourceList.sources){
    assert.ok(source.organization&&source.locator&&source.reviewedAt);
    assert.ok(confidence.includes(source.confidence));
  }
});

test('every claim is source-backed and bounded',()=>{
  for(const row of data.claims){
    assert.ok(sources[row.sourceKey],`missing source ${row.sourceKey}`);
    assert.ok(confidence.includes(row.confidence),`bad confidence ${row.confidence}`);
    if(row.type==='seasonality') assert.ok(Number.isInteger(row.month)&&row.month>=1&&row.month<=12);
    if(row.type==='nutrition') assert.ok(typeof row.value==='number'&&row.value>=0);
    if(row.type==='function') assert.ok(row.score>=0&&row.score<=100);
    if(row.type==='substitution') for(const k of ['culinaryFunction','flavor','texture','nutrition','approximateCost','availability','restrictionCompatibility']) assert.ok(row[k]>=0&&row[k]<=100,`${k} out of range`);
    if(['allergen','nutrition','seasonality'].includes(row.type)) assert.ok(row.sourceKey);
  }
});

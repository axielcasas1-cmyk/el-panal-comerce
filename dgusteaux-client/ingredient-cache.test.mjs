import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryIngredientStore,getCachedIngredient,putCachedIngredient,pruneIngredientCache} from './ingredient-cache.js';

function profile(id='x'){
  return {ok:true,ingredient:{id,canonicalName:'tomate'},sources:[{id:'s1',confidence:'HIGH',reviewedAt:'2026-09-01',current:true}],warnings:[]};
}

test('cache preserves provenance confidence and reviewedAt',async()=>{
  const store=createMemoryIngredientStore();
  await putCachedIngredient(profile('a'),{store,now:1000});
  const r=await getCachedIngredient('a',{store,now:2000,maxAgeMs:5000});
  assert.equal(r.stale,false); assert.equal(r.profile.sources[0].confidence,'HIGH'); assert.equal(r.profile.sources[0].reviewedAt,'2026-09-01');
});

test('profile without provenance is rejected',async()=>{
  const store=createMemoryIngredientStore();
  await assert.rejects(()=>putCachedIngredient({ok:true,ingredient:{id:'x'},sources:[]},{store}),/profile_provenance_required/);
});

test('cache is bounded to 50 and evicts oldest',async()=>{
  const store=createMemoryIngredientStore();
  for(let i=0;i<51;i++) await putCachedIngredient(profile(String(i)),{store,now:i});
  await pruneIngredientCache({store,maxRecords:50});
  assert.equal((await store.entries()).length,50); assert.equal(await store.get('0'),undefined); assert.ok(await store.get('50'));
});

test('old records are labelled stale without losing data',async()=>{
  const store=createMemoryIngredientStore();
  await putCachedIngredient(profile('old'),{store,now:100});
  const r=await getCachedIngredient('old',{store,now:1000,maxAgeMs:500});
  assert.equal(r.stale,true); assert.equal(r.profile.ingredient.id,'old');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {searchIngredients,getIngredientProfile,suggestSubstitutes,analyzeIngredients,getSeasonalIngredients} from './ingredient-intelligence.js';

function sb({session=true,data=null,error=null}={}){
  const calls=[];
  return {calls,auth:{getSession:async()=>({data:{session:session?{user:{id:'u1'}}:null}})},rpc:async(name,args)=>{calls.push({name,args});return {data,error};}};
}

test('authenticated search success preserves warnings',async()=>{
  const supabase=sb({data:{ok:true,results:[{id:'1',canonicalName:'garbanzo'}],warnings:['CONFIANZA MEDIA']}});
  const r=await searchIngredients({supabase,query:'garbanzo',context:{country:'ES'}});
  assert.equal(r.ok,true); assert.equal(r.data.results[0].canonicalName,'garbanzo');
  assert.deepEqual(r.warnings,['CONFIANZA MEDIA']);
  assert.equal(supabase.calls[0].name,'dgusteaux_search_ingredients');
});

test('no session returns authentication_required without RPC',async()=>{
  const supabase=sb({session:false});
  const r=await getIngredientProfile({supabase,ingredientId:'1'});
  assert.equal(r.ok,false); assert.equal(r.reason,'authentication_required'); assert.equal(supabase.calls.length,0);
});

test('RPC error is not converted to success',async()=>{
  const r=await getSeasonalIngredients({supabase:sb({error:{message:'network'}}),context:{country:'ES',month:9}});
  assert.equal(r.ok,false); assert.equal(r.reason,'network');
});

test('malformed response is rejected',async()=>{
  const r=await suggestSubstitutes({supabase:sb({data:{ok:true,substitutes:'bad'}}),ingredientId:'1'});
  assert.equal(r.ok,false); assert.equal(r.reason,'invalid_server_response');
});

test('structured uncertainty stays failure',async()=>{
  const data={ok:false,error:'ambiguous_alias',unresolved:[{input:'mani',error:'ambiguous_alias'}],warnings:['insufficient_safety_evidence']};
  const r=await analyzeIngredients({supabase:sb({data}),ingredients:['mani'],context:{allergies:['peanut']}});
  assert.equal(r.ok,false); assert.equal(r.reason,'ambiguous_alias'); assert.deepEqual(r.data,data);
  assert.deepEqual(r.warnings,['insufficient_safety_evidence']);
});

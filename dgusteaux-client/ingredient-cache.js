const ALLOWED_CONFIDENCE=new Set(['VERIFIED','HIGH','MEDIUM','LOW','UNVERIFIED']);
const DEFAULT_MAX=50;
const DEFAULT_MAX_AGE=7*24*60*60*1000;
const memoryBacking=new Map();

function clone(value){ return globalThis.structuredClone?structuredClone(value):JSON.parse(JSON.stringify(value)); }

export function createMemoryIngredientStore(){
  const map=new Map();
  return {
    async get(key){ return map.has(key)?clone(map.get(key)):undefined; },
    async set(key,value){ map.set(key,clone(value)); },
    async delete(key){ map.delete(key); },
    async entries(){ return [...map.entries()].map(([key,value])=>[key,clone(value)]); }
  };
}

const defaultMemoryStore={
  async get(key){ return memoryBacking.has(key)?clone(memoryBacking.get(key)):undefined; },
  async set(key,value){ memoryBacking.set(key,clone(value)); },
  async delete(key){ memoryBacking.delete(key); },
  async entries(){ return [...memoryBacking.entries()].map(([key,value])=>[key,clone(value)]); }
};

function openDb(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('dgusteaux-ingredient-cache-v1',1);
    request.onupgradeneeded=()=>{ if(!request.result.objectStoreNames.contains('profiles')) request.result.createObjectStore('profiles'); };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('indexeddb_open_failed'));
  });
}
function idbRequest(req){ return new Promise((resolve,reject)=>{ req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
function txDone(tx){ return new Promise((resolve,reject)=>{ tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error); }); }

const indexedDbStore={
  async get(key){ const db=await openDb(); const tx=db.transaction('profiles','readonly'); const value=await idbRequest(tx.objectStore('profiles').get(key)); await txDone(tx); db.close(); return value; },
  async set(key,value){ const db=await openDb(); const tx=db.transaction('profiles','readwrite'); tx.objectStore('profiles').put(value,key); await txDone(tx); db.close(); },
  async delete(key){ const db=await openDb(); const tx=db.transaction('profiles','readwrite'); tx.objectStore('profiles').delete(key); await txDone(tx); db.close(); },
  async entries(){ const db=await openDb(); const tx=db.transaction('profiles','readonly'); const store=tx.objectStore('profiles'); const keys=await idbRequest(store.getAllKeys()); const values=await idbRequest(store.getAll()); await txDone(tx); db.close(); return keys.map((key,i)=>[key,values[i]]); }
};

function resolveStore(store){ return store||(typeof indexedDB!=='undefined'?indexedDbStore:defaultMemoryStore); }
function validProfile(profile){
  return Boolean(profile&&profile.ok===true&&profile.ingredient?.id&&Array.isArray(profile.sources)&&profile.sources.length>0&&
    profile.sources.every(source=>source&&ALLOWED_CONFIDENCE.has(source.confidence)&&typeof source.reviewedAt==='string'&&source.reviewedAt.length>=10));
}

export async function pruneIngredientCache({store,maxRecords=DEFAULT_MAX}={}){
  const target=resolveStore(store); const limit=Math.max(1,Math.min(DEFAULT_MAX,Number(maxRecords)||DEFAULT_MAX));
  const entries=await target.entries();
  entries.sort((a,b)=>(a[1]?.cachedAt??0)-(b[1]?.cachedAt??0));
  for(const [key] of entries.slice(0,Math.max(0,entries.length-limit))) await target.delete(key);
  return {size:Math.min(entries.length,limit),maxRecords:limit};
}

export async function putCachedIngredient(profile,{store,now=Date.now(),maxRecords=DEFAULT_MAX}={}){
  if(!validProfile(profile)) throw new TypeError('profile_provenance_required');
  const target=resolveStore(store); const record={id:String(profile.ingredient.id),profile:clone(profile),cachedAt:Number(now)};
  await target.set(record.id,record); await pruneIngredientCache({store:target,maxRecords}); return clone(record);
}

export async function getCachedIngredient(ingredientId,{store,now=Date.now(),maxAgeMs=DEFAULT_MAX_AGE}={}){
  const target=resolveStore(store); const record=await target.get(String(ingredientId)); if(!record) return null;
  const sourceStale=record.profile.sources.some(source=>source.current===false);
  const stale=sourceStale||(Number(now)-Number(record.cachedAt)>Math.max(0,Number(maxAgeMs)||0));
  return {profile:clone(record.profile),cachedAt:record.cachedAt,stale};
}

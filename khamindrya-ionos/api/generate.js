'use strict';
const {validateRecipe,validateContext,generateFallback}=require('../lib/culinary.js');

function send(res,status,payload){res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.setHeader('access-control-allow-origin','*');res.end(JSON.stringify(payload));}
function canonical(body={}){
  const palate=body.palate&&typeof body.palate==='object'?body.palate:{};
  return {prompt:String(body.prompt||'').slice(0,2000),pantryItems:Array.isArray(body.pantryItems)?body.pantryItems.slice(0,50):[],servings:body.servings,budget:body.budget,timeMinutes:body.timeMinutes,equipment:Array.isArray(body.equipment)?body.equipment.slice(0,30):[],allergies:Array.isArray(body.allergies)?body.allergies.slice(0,30):(Array.isArray(palate.allergies)?palate.allergies.slice(0,30):[]),restrictions:Array.isArray(body.restrictions)?body.restrictions.slice(0,30):(Array.isArray(palate.restrictions)?palate.restrictions.slice(0,30):[]),region:body.region&&typeof body.region==='object'?body.region:{},profile:body.profile&&typeof body.profile==='object'?body.profile:{},palate};
}
async function callProvider(ctx){
  const url=String(process.env.DGUSTEAUX_AI_URL||'').trim();if(!url)return null;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const headers={'content-type':'application/json'},token=String(process.env.DGUSTEAUX_AI_TOKEN||'').trim();if(token)headers.authorization=`Bearer ${token}`;const r=await fetch(url,{method:'POST',headers,body:JSON.stringify({task:'generate_safe_recipe',context:ctx,requirements:{jsonOnly:true,noAlcohol:true,respectAllergies:true,noNewIngredientsForPalate:true}}),signal:controller.signal});if(!r.ok)throw new Error(`provider_http_${r.status}`);const data=await r.json();return data&&typeof data==='object'?(data.recipe||data):null}finally{clearTimeout(timer)}
}
async function handler(req,res){
  if(req.method==='OPTIONS'){res.statusCode=204;res.setHeader('access-control-allow-origin','*');res.setHeader('access-control-allow-methods','POST,OPTIONS');res.setHeader('access-control-allow-headers','content-type,authorization');return res.end()}
  if(req.method!=='POST')return send(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch{return send(res,400,{ok:false,error:'INVALID_JSON'})}}
  const ctx=canonical(body||{});if(!ctx.prompt.trim())return send(res,400,{ok:false,error:'PROMPT_REQUIRED'});const requestCheck=validateContext(ctx);if(!requestCheck.ok)return send(res,422,{ok:false,error:'CULINARY_CONTEXT_CONFLICT',reason:requestCheck.reason});
  const warnings=[];let candidate=null,source='fallback';
  try{candidate=await callProvider(ctx);if(candidate)source='provider'}catch{warnings.push('El proveedor inteligente no respondió; MELO continuó en modo seguro local.')}
  if(candidate){const checked=validateRecipe(candidate,ctx);if(checked.ok)return send(res,200,{ok:true,source,recipe:checked.recipe,warnings:[...warnings,...checked.warnings],explanation:{mode:'provider_validated',palate:checked.recipe.palateAdaptation?.applied||[]}});warnings.push(...checked.warnings,'La propuesta externa no superó el Safety Gate; MELO usó el motor seguro de respaldo.')}
  const fallback=generateFallback(ctx),checked=validateRecipe(fallback,ctx);if(!checked.ok)return send(res,500,{ok:false,error:'SAFE_FALLBACK_FAILED',reason:checked.reason});
  return send(res,200,{ok:true,source:'fallback',recipe:checked.recipe,warnings:[...warnings,...checked.warnings],explanation:{mode:'deterministic_safe_fallback',palate:checked.recipe.palateAdaptation?.applied||[]}})
}
module.exports=handler;module.exports.canonical=canonical;module.exports.callProvider=callProvider;

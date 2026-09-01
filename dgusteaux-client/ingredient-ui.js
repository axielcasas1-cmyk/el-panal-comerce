const CONFIDENCE_ORDER={UNVERIFIED:0,LOW:1,MEDIUM:2,HIGH:3,VERIFIED:4};

export function confidenceLabel(level){
  return ({VERIFIED:'✓ VERIFICADO',HIGH:'ALTA CONFIANZA',MEDIUM:'CONFIANZA MEDIA',LOW:'DATO LIMITADO',UNVERIFIED:'DATO LIMITADO'})[level]||'DATO LIMITADO';
}

function unique(values){ return [...new Set(values.filter(Boolean))]; }
function payload(value){ return value?.data&&typeof value.data==='object'?value.data:value; }
function conservativeConfidence(sources=[]){
  if(!sources.length) return 'UNVERIFIED';
  return sources.reduce((worst,source)=>((CONFIDENCE_ORDER[source?.confidence]??0)<(CONFIDENCE_ORDER[worst]??0)?source.confidence:worst),sources[0]?.confidence||'UNVERIFIED');
}

export function buildIngredientViewModel(profileInput){
  const profile=payload(profileInput)||{};
  const ingredient=profile.ingredient||{};
  const sources=Array.isArray(profile.sources)?profile.sources:[];
  const warnings=Array.isArray(profile.warnings)?profile.warnings:[];
  const uncertainty=[...warnings];
  for(const source of sources){ if(['LOW','UNVERIFIED'].includes(source?.confidence)||source?.current===false) uncertainty.push(`limited_source:${source?.id||source?.organization||'unknown'}`); }
  const allergens=(Array.isArray(profile.allergens)?profile.allergens:[]).map(a=>{
    const uncertain=['LOW','UNVERIFIED'].includes(a?.confidence)||a?.relation==='UNKNOWN';
    if(uncertain) uncertainty.push(`allergen_uncertain:${a?.allergen||'unknown'}`);
    return {name:a?.allergen||'',state:a?.relation||'UNKNOWN',confidence:a?.confidence||'UNVERIFIED',confidenceLabel:confidenceLabel(a?.confidence),sourceId:a?.sourceId||null,uncertain};
  });
  const overall=conservativeConfidence(sources);
  return {
    identity:{id:ingredient.id||null,name:ingredient.canonicalName||'',scientificName:ingredient.scientificName||null,category:ingredient.category||null,subcategory:ingredient.subcategory||null,defaultForm:ingredient.defaultForm||null,originRegion:ingredient.originRegion||null},
    confidence:{level:overall,label:confidenceLabel(overall)},
    provenance:sources.map(s=>({id:s.id||null,title:s.title||'',organization:s.organization||'',locator:s.locator||null,reviewedAt:s.reviewedAt||null,confidence:s.confidence||'UNVERIFIED',confidenceLabel:confidenceLabel(s.confidence),current:s.current!==false})),
    sensory:profile.sensory&&typeof profile.sensory==='object'?profile.sensory:{},
    functions:Array.isArray(profile.functions)?profile.functions:[],
    nutrition:Array.isArray(profile.nutrition)?profile.nutrition:[],
    allergens,
    seasonality:Array.isArray(profile.seasonality)?profile.seasonality:[],
    compatibility:Array.isArray(profile.compatibility)?profile.compatibility:[],
    uncertainty:unique(uncertainty)
  };
}

export function buildSubstitutionViewModel(resultInput){
  const result=payload(resultInput)||{};
  const uncertainty=Array.isArray(result.warnings)?[...result.warnings]:[];
  const safetyLabels={safe:'APTO SEGÚN CONTEXTO',unsafe:'NO APTO',insufficient_evidence:'EVIDENCIA INSUFICIENTE'};
  const items=(Array.isArray(result.substitutes)?result.substitutes:[]).map(item=>{
    const status=item.safetyStatus||'insufficient_evidence';
    const limited=['LOW','UNVERIFIED'].includes(item.confidence);
    if(status==='insufficient_evidence') uncertainty.push(`insufficient_safety_evidence:${item.canonicalName||item.id||'unknown'}`);
    if(status==='unsafe') uncertainty.push(`unsafe_substitute:${item.canonicalName||item.id||'unknown'}`);
    if(limited) uncertainty.push(`limited_confidence:${item.canonicalName||item.id||'unknown'}`);
    return {
      id:item.id||null,name:item.canonicalName||'',safe:status==='safe',safetyStatus:status,safetyLabel:safetyLabels[status]||'EVIDENCIA INSUFICIENTE',
      overallScore:Number(item.overallScore)||0,dimensions:{
        culinaryFunction:Number(item.scores?.culinaryFunction)||0,flavor:Number(item.scores?.flavor)||0,texture:Number(item.scores?.texture)||0,
        nutrition:Number(item.scores?.nutrition)||0,approximateCost:Number(item.scores?.approximateCost)||0,availability:Number(item.scores?.availability)||0,
        restrictionCompatibility:Number(item.scores?.restrictionCompatibility)||0
      },
      confidence:item.confidence||'UNVERIFIED',confidenceLabel:confidenceLabel(item.confidence),explanation:item.explanation||'',caveats:item.caveats||'',source:item.source||null
    };
  });
  return {items,uncertainty:unique(uncertainty)};
}

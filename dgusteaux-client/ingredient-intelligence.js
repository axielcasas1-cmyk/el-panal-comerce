const UNCERTAINTY_CODES=new Set([
  'insufficient_safety_evidence','ambiguous_alias','ingredient_not_resolved','nutrition_not_verified',
  'allergen_evidence_missing','no_safe_substitute','region_not_covered','source_stale_or_superseded'
]);

async function hasSession(supabase){
  if(!supabase?.auth?.getSession||!supabase?.rpc) return false;
  const result=await supabase.auth.getSession();
  return Boolean(result?.data?.session?.user);
}

function warningsOf(data){ return Array.isArray(data?.warnings)?data.warnings:[]; }
function fail(reason,data=null){ return {ok:false,data,warnings:warningsOf(data),reason}; }
function pass(data){ return {ok:true,data,warnings:warningsOf(data),reason:null}; }

async function call({supabase,name,args,valid}){
  try{
    if(!(await hasSession(supabase))) return fail('authentication_required');
    const {data,error}=await supabase.rpc(name,args);
    if(error) return fail(error.message||'rpc_failed');
    if(!data||typeof data!=='object') return fail('invalid_server_response',data);
    if(data.ok===false){
      const reason=typeof data.error==='string'?data.error:'server_rejected';
      return fail(UNCERTAINTY_CODES.has(reason)?reason:reason,data);
    }
    if(data.ok!==true||!valid(data)) return fail('invalid_server_response',data);
    return pass(data);
  }catch(error){
    return fail(error instanceof Error?error.message:'rpc_failed');
  }
}

export function searchIngredients({supabase,query='',context={}}={}){
  return call({supabase,name:'dgusteaux_search_ingredients',args:{p_query:query,p_context:context},valid:d=>Array.isArray(d.results)});
}
export function getIngredientProfile({supabase,ingredientId,context={}}={}){
  return call({supabase,name:'dgusteaux_get_ingredient',args:{p_ingredient_id:ingredientId,p_context:context},valid:d=>Boolean(d.ingredient&&typeof d.ingredient==='object'&&Array.isArray(d.sources)&&Array.isArray(d.allergens)&&Array.isArray(d.seasonality))});
}
export function suggestSubstitutes({supabase,ingredientId,context={}}={}){
  return call({supabase,name:'dgusteaux_suggest_substitutes',args:{p_ingredient_id:ingredientId,p_context:context},valid:d=>Array.isArray(d.substitutes)});
}
export function analyzeIngredients({supabase,ingredients=[],context={}}={}){
  return call({supabase,name:'dgusteaux_analyze_ingredients',args:{p_ingredients:ingredients,p_context:context},valid:d=>Array.isArray(d.resolved)&&Array.isArray(d.unresolved)&&Array.isArray(d.safetyFindings)&&d.pantrySummary&&typeof d.pantrySummary==='object'});
}
export function getSeasonalIngredients({supabase,context={}}={}){
  return call({supabase,name:'dgusteaux_get_seasonal_ingredients',args:{p_context:context},valid:d=>Array.isArray(d.ingredients)});
}

const SERVER_LABEL='MELO Intelligence · servidor';
const LOCAL_LABEL='MELO · modo local';

function validRecipe(recipe){
  return Boolean(
    recipe && typeof recipe==='object' &&
    typeof recipe.title==='string' && recipe.title.trim() &&
    Array.isArray(recipe.ingredients) &&
    Array.isArray(recipe.steps) && recipe.steps.length>0 &&
    Array.isArray(recipe.allergens) &&
    typeof recipe.safety==='string'
  );
}

function localResult(localGenerate,prompt,pantryItems,reason){
  const recipe=localGenerate({prompt,pantryItems});
  return {mode:'local',label:LOCAL_LABEL,source:'local',recipe,warnings:[],explanation:[],reason};
}

export async function generateWithMelo({supabase,prompt='',pantryItems=[],localGenerate,context={},ingredientIntelligence=null,online=globalThis.navigator?.onLine??true}={}){
  if(typeof localGenerate!=='function') throw new TypeError('localGenerate_required');
  if(!online||!supabase?.auth?.getSession||!supabase?.rpc) return localResult(localGenerate,prompt,pantryItems,'offline_or_cloud_unavailable');
  try{
    const sessionResult=await supabase.auth.getSession();
    const session=sessionResult?.data?.session;
    if(!session?.user) return localResult(localGenerate,prompt,pantryItems,'authentication_required');
    const p_context={...context,prompt,pantry:pantryItems};
    if(typeof ingredientIntelligence?.analyzeIngredients==='function'){
      try{
        const analysisIngredients=Array.isArray(context?.ingredients)?context.ingredients:pantryItems;
        const analysis=await ingredientIntelligence.analyzeIngredients({supabase,ingredients:analysisIngredients,context});
        if(analysis?.ok===true&&analysis.data&&typeof analysis.data==='object') p_context.ingredientIntelligence=analysis.data;
      }catch{}
    }
    const {data,error}=await supabase.rpc('dgusteaux_generate_recipe',{p_context});
    if(error||!data?.ok||!validRecipe(data.recipe)) return localResult(localGenerate,prompt,pantryItems,error?.message||'invalid_server_response');
    return {
      mode:'server',label:SERVER_LABEL,source:data.source||'fallback',recipe:data.recipe,
      warnings:Array.isArray(data.warnings)?data.warnings:[],
      explanation:Array.isArray(data.explanation)?data.explanation:[]
    };
  }catch(error){
    return localResult(localGenerate,prompt,pantryItems,error instanceof Error?error.message:'rpc_failed');
  }
}

export {validRecipe};

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWithMelo } from './melo-intelligence.js';

const localRecipe={id:'local-1',title:'Local',ingredients:[],steps:[{title:'Paso',text:'Seguro'}],allergens:[],safety:'Local'};
const localGenerate=()=>structuredClone(localRecipe);

function supabaseStub({session=true,data=null,error=null,onRpc}={}){
  return {auth:{getSession:async()=>({data:{session:session?{user:{id:'u1'}}:null}})},rpc:async(name,args)=>{onRpc?.(name,args);assert.equal(name,'dgusteaux_generate_recipe');assert.ok(args.p_context);return {data,error};}};
}
const serverRecipe={id:'srv-1',title:'Servidor',ingredients:[{name:'arroz'}],steps:[{title:'Cocinar',text:'Cocina completamente.',requiresAdultSupervision:true}],allergens:[],safety:'Seguro'};

test('uses server RPC when authenticated and response is valid',async()=>{const result=await generateWithMelo({supabase:supabaseStub({data:{ok:true,source:'fallback',recipe:serverRecipe,warnings:[],explanation:['safe']}}),prompt:'arroz',pantryItems:['arroz'],localGenerate,online:true});assert.equal(result.mode,'server');assert.equal(result.label,'MELO Intelligence · servidor');assert.equal(result.recipe.title,'Servidor');});
test('falls back locally on RPC error',async()=>{const result=await generateWithMelo({supabase:supabaseStub({error:{message:'down'}}),prompt:'arroz',pantryItems:[],localGenerate,online:true});assert.equal(result.mode,'local');assert.equal(result.recipe.title,'Local');});
test('falls back locally on malformed server recipe',async()=>{const result=await generateWithMelo({supabase:supabaseStub({data:{ok:true,source:'fallback',recipe:{title:'bad'}}}),prompt:'arroz',pantryItems:[],localGenerate,online:true});assert.equal(result.mode,'local');});
test('does not call RPC without authenticated session',async()=>{let rpcCalls=0;const sb=supabaseStub({session:false});sb.rpc=async()=>{rpcCalls++;return {data:null,error:null}};const result=await generateWithMelo({supabase:sb,prompt:'arroz',pantryItems:[],localGenerate,online:true});assert.equal(rpcCalls,0);assert.equal(result.mode,'local');assert.equal(result.label,'MELO · modo local');});
test('does not call RPC offline',async()=>{let rpcCalls=0;const sb=supabaseStub({session:true});sb.rpc=async()=>{rpcCalls++;return {data:null,error:null}};const result=await generateWithMelo({supabase:sb,prompt:'arroz',pantryItems:[],localGenerate,online:false});assert.equal(rpcCalls,0);assert.equal(result.mode,'local');});

test('resolved ingredient analysis reaches server context',async()=>{
  let sent;
  const intelligence={analyzeIngredients:async({ingredients,context})=>{assert.deepEqual(ingredients,['arroz']);assert.equal(context.country,'ES');return {ok:true,data:{resolved:[{canonicalName:'arroz'}],unresolved:[],safetyFindings:[],functions:[],pantrySummary:{atHome:1,substitutable:0,missing:0},warnings:[]}};}};
  const result=await generateWithMelo({supabase:supabaseStub({data:{ok:true,source:'fallback',recipe:serverRecipe,warnings:[],explanation:[]},onRpc:(_,args)=>{sent=args.p_context;}}),prompt:'arroz',pantryItems:['arroz'],localGenerate,context:{country:'ES'},ingredientIntelligence:intelligence,online:true});
  assert.equal(result.mode,'server'); assert.equal(sent.ingredientIntelligence.resolved[0].canonicalName,'arroz');
});

test('ingredient analysis failure preserves original generation flow',async()=>{
  let sent;
  const intelligence={analyzeIngredients:async()=>({ok:false,reason:'insufficient_safety_evidence'})};
  const result=await generateWithMelo({supabase:supabaseStub({data:{ok:true,source:'fallback',recipe:serverRecipe,warnings:[],explanation:[]},onRpc:(_,args)=>{sent=args.p_context;}}),prompt:'arroz',pantryItems:['arroz'],localGenerate,context:{country:'ES'},ingredientIntelligence:intelligence,online:true});
  assert.equal(result.mode,'server'); assert.equal('ingredientIntelligence' in sent,false); assert.equal(sent.country,'ES');
});

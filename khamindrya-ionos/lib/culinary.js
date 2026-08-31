'use strict';

const ALCOHOL_RE = /\b(vino|cerveza|licor|ron|whisky|whiskey|vodka|brandy|cognac|vermut|verm[uú]t|champagne|cava|alcohol|flamb[eé])\b/i;
const POULTRY_RE = /\b(pollo|pavo|ave|gallina)\b/i;
const RISK_RE = /cuchill|cort(a|e|ar)|pica|fuego|horno|sart[eé]n|fre[ií]r|aceite caliente|herv|plancha|parrilla|gas|calor/i;

function norm(v='') {
  return String(v).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}
function clamp(n,min,max,fallback) {
  const x=Number(n); return Number.isFinite(x)?Math.max(min,Math.min(max,x)):fallback;
}
function inferServings(prompt='') {
  const m=String(prompt).match(/(\d+)\s*(personas?|comensales?|raciones?)/i);
  return m?clamp(m[1],1,12,2):2;
}
function inferBudget(prompt='') {
  const m=String(prompt).match(/(?:menos de|presupuesto(?: de)?|por)\s*(\d+(?:[.,]\d+)?)\s*€/i);
  return m?Number(m[1].replace(',','.')):null;
}
function allergyTerms(allergies=[]) {
  const out=[];
  for (const raw of allergies||[]) {
    const n=norm(raw); if(!n) continue; out.push(n);
    if(/cacahuete|peanut/.test(n)) out.push('cacahuete','peanut');
    if(/leche|lacteo|lactosa/.test(n)) out.push('leche','lacteo','lactosa');
    if(/gluten|trigo/.test(n)) out.push('gluten','trigo');
    if(/huevo/.test(n)) out.push('huevo');
    if(/frutos secos|nuez/.test(n)) out.push('nuez','almendra','avellana','pistacho','anacardo','frutos secos');
  }
  return [...new Set(out)];
}
function conflicts(text,terms) {
  const n=norm(text); return terms.some(t=>n.includes(norm(t)));
}
function palateSignals(p={}) {
  const pairs=[['ácido',p.acidic],['umami',p.umami],['crujiente',p.crunchy],['cremoso',p.creamy],['dulce',p.sweet],['salado',p.salty],['amargo',p.bitter],['picante',p.spicy]]
    .filter(x=>Number.isFinite(Number(x[1])));
  pairs.sort((a,b)=>Math.abs(Number(b[1])-2.5)-Math.abs(Number(a[1])-2.5));
  return pairs.slice(0,2);
}
function adaptTechnique(recipe,palate={}) {
  const r=JSON.parse(JSON.stringify(recipe)); const applied=[];
  for (const [name,val0] of palateSignals(palate)) {
    const val=Number(val0); if(Math.abs(val-2.5)<0.8) continue;
    if(name==='umami'&&val>=3.4) {
      const s=r.steps.find(x=>/dora|sofrito|saltea|tosta/i.test((x.title||'')+' '+(x.text||'')));
      if(s&&!/bien dorad/i.test(s.text||'')) s.text+=' Busca un dorado uniforme para desarrollar sabor sin añadir más sal.';
      applied.push('umami mediante dorado y concentración, sin aumentar la sal');
    } else if(name==='ácido'&&val>=3.4) {
      const s=r.steps[r.steps.length-1]; if(s) s.text+=' Ajusta la sensación de frescor solo con los componentes ácidos ya presentes en la receta.';
      applied.push('contraste ácido usando únicamente ingredientes ya presentes');
    } else if(name==='crujiente'&&val>=3.4) {
      const s=r.steps.find(x=>/dora|saltea|tosta/i.test((x.title||'')+' '+(x.text||'')));
      if(s) s.text+=' Mantén la superficie lo más seca posible para favorecer contraste crujiente.';
      applied.push('contraste crujiente mediante técnica, sin añadir ingredientes');
    } else if(name==='cremoso'&&val>=3.4) {
      const s=r.steps[r.steps.length-1]; if(s) s.text+=' Integra los jugos del propio plato para una textura más ligada, sin incorporar ingredientes nuevos.';
      applied.push('textura más ligada usando los propios jugos');
    } else if(name==='picante'&&val<=1.8) {
      for(const s of r.steps) s.text=String(s.text||'').replace(/picante|chile|guindilla/gi,'condimento aromático opcional');
      applied.push('picante reducido');
    } else if(name==='dulce'&&val<=1.8) {
      applied.push('dulzor contenido');
    } else if(name==='salado'&&val>=3.4) {
      applied.push('intensidad sabrosa mediante tostado/aroma, sin aumentar la sal');
    }
  }
  r.palateAdaptation={applied,source:'profile'};
  if(applied.length) r.summary=`${r.summary} MELO ajustó ${applied.join('; ')}.`;
  return r;
}
function scaleIngredients(items,factor) {
  return items.map(i=>({...i,qty:typeof i.qty==='number'?Math.round(i.qty*factor*10)/10:i.qty,status:i.status||'FALTA'}));
}
function chickenRiceBase() {
  return {
    title:'Arroz meloso de pollo, tomate tostado y limón', category:'Innovación D’GUSTEAUX',
    summary:'Arroz sabroso con sofrito concentrado, pollo bien cocinado y final fresco.',
    ingredients:[
      {name:'pollo',qty:300,unit:'g'},{name:'arroz',qty:160,unit:'g'},{name:'tomate',qty:250,unit:'g'},
      {name:'cebolla',qty:100,unit:'g'},{name:'ajo',qty:1,unit:'diente',optional:true},{name:'caldo o agua',qty:500,unit:'ml'},
      {name:'limón',qty:0.5,unit:'unidad',optional:true},{name:'aceite',qty:15,unit:'ml'},{name:'sal',qty:'al gusto',unit:''}
    ],
    allergens:[], equipment:['cazuela','tabla','cuchillo','cuchara'],
    steps:[
      {title:'Mise en place',text:'Separa el pollo crudo de los alimentos listos para comer. Si eres menor, un adulto realiza los cortes.',minutes:5},
      {title:'Dorar el pollo',text:'Con supervisión adulta, cocina el pollo en una cazuela a fuego medio-alto hasta dorar la superficie.',minutes:6,temp:'medio-alto'},
      {title:'Construir el sofrito',text:'Baja a fuego medio y cocina cebolla y tomate hasta concentrar sus jugos.',minutes:8,temp:'medio'},
      {title:'Cocer el arroz',text:'Añade arroz y caldo o agua caliente y cocina suavemente hasta que el arroz esté tierno.',minutes:16,temp:'suave'},
      {title:'Final y seguridad',text:'Comprueba que el pollo esté completamente cocinado; si usas termómetro, el centro debe alcanzar al menos 74 °C. Ajusta el punto con los ingredientes ya presentes y sirve.',minutes:2}
    ],
    plating:'Sirve en plato hondo con el pollo visible y los jugos ligados.',
    safety:'Evita contaminación cruzada con pollo crudo. Los menores requieren supervisión adulta para cuchillos y calor.'
  };
}
function sweetBase() {
  return {
    title:'Plátano tibio con cacao y canela', category:'Dulce',
    summary:'Postre sencillo con fruta tibia, cacao y contraste aromático.',
    ingredients:[{name:'plátano',qty:2,unit:'unidad'},{name:'cacao puro',qty:12,unit:'g'},{name:'canela',qty:1,unit:'pizca',optional:true}],
    allergens:[], equipment:['sartén antiadherente','espátula'],
    steps:[
      {title:'Preparar',text:'Pela y corta el plátano. Si eres menor y hace falta cuchillo, pide a un adulto que realice el corte.',minutes:2},
      {title:'Calentar la fruta',text:'Con supervisión adulta, calienta la fruta a fuego medio hasta que se ablande y se dore ligeramente.',minutes:4,temp:'medio'},
      {title:'Terminar',text:'Retira del fuego y espolvorea cacao y canela.',minutes:1}
    ],
    plating:'Sirve la fruta en abanico y termina con una capa fina de cacao.',
    safety:'Los menores requieren supervisión adulta durante el uso de calor o cuchillos.'
  };
}
function pantryBase(pantry,terms) {
  const safe=pantry.filter(x=>!conflicts(x,terms)&&!ALCOHOL_RE.test(x)).slice(0,4);
  return {
    title:'Salteado de despensa D’GUSTEAUX', category:'Aprovechamiento',
    summary:'Una fórmula flexible para transformar ingredientes disponibles en un plato equilibrado.',
    ingredients:[...safe.map((name,i)=>({name,qty:i===0?180:120,unit:'g'})),{name:'cebolla',qty:100,unit:'g'},{name:'aceite',qty:15,unit:'ml'},{name:'sal',qty:'al gusto',unit:''}],
    allergens:[], equipment:['sartén','tabla','cuchillo','espátula'],
    steps:[
      {title:'Preparar',text:'Corta los ingredientes en tamaños similares. Si eres menor, un adulto realiza los cortes.',minutes:5},
      {title:'Cocinar por dureza',text:'Con supervisión adulta, cocina primero los ingredientes más firmes a fuego medio y añade después los más delicados.',minutes:8,temp:'medio'},
      {title:'Ajustar',text:'Prueba el punto y ajusta usando solo los ingredientes de la receta.',minutes:2,temp:'bajo'}
    ],
    plating:'Sirve con el componente principal centrado y contraste visible de texturas.',
    safety:'Cocina completamente carnes, pescados o huevos y mantén una higiene estricta de manos, tablas y utensilios.'
  };
}
function generateFallback(ctx={}) {
  const prompt=String(ctx.prompt||''); const p=norm(prompt);
  const pantry=(ctx.pantryItems||ctx.pantry||[]).map(x=>typeof x==='string'?x:(x&&x.name)||'').filter(Boolean);
  const terms=allergyTerms(ctx.allergies||((ctx.palate||{}).allergies)||[]);
  const servings=clamp(ctx.servings,1,12,inferServings(prompt)); const budget=ctx.budget==null?inferBudget(prompt):Number(ctx.budget);
  const has=x=>p.includes(norm(x))||pantry.some(i=>norm(i).includes(norm(x)));
  let base;
  if(has('pollo')&&has('arroz')) base=chickenRiceBase();
  else if(/dulce|postre|cacao|chocolate/.test(p)) base=sweetBase();
  else base=pantryBase(pantry,terms);
  base.ingredients=scaleIngredients(base.ingredients,servings/2).filter(i=>!conflicts(i.name,terms));
  base.servings=servings; base.budget=Number.isFinite(budget)?budget:null;
  base.estimatedCost=Math.round(base.ingredients.reduce((s,i)=>s+(typeof i.qty==='number'?Math.max(0.25,i.qty/300):0.25),0)*100)/100;
  base.currency=ctx.currency||((ctx.profile||{}).currency)||'EUR';
  base.id=(globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():`r-${Date.now()}`; base.createdAt=new Date().toISOString();
  return adaptTechnique(base,ctx.palate||{});
}
function validateContext(ctx={}) {
  const prompt=String(ctx.prompt||'');
  const terms=allergyTerms(ctx.allergies||((ctx.palate||{}).allergies)||[]);
  if(terms.length&&conflicts(prompt,terms)) return {ok:false,reason:'prompt_allergen_conflict'};
  if(ALCOHOL_RE.test(prompt)) return {ok:false,reason:'alcohol_not_allowed'};
  return {ok:true};
}
function validateRecipe(candidate,ctx={}) {
  const warnings=[];
  if(!candidate||typeof candidate!=='object') return {ok:false,reason:'invalid_object',warnings};
  const r=JSON.parse(JSON.stringify(candidate));
  if(typeof r.title!=='string'||!r.title.trim()) return {ok:false,reason:'title_required',warnings};
  if(!Array.isArray(r.ingredients)||r.ingredients.length<1||r.ingredients.length>30) return {ok:false,reason:'ingredients_invalid',warnings};
  if(!Array.isArray(r.steps)||r.steps.length<1||r.steps.length>20) return {ok:false,reason:'steps_invalid',warnings};
  const terms=allergyTerms(ctx.allergies||((ctx.palate||{}).allergies)||[]);
  const allergenText=[...r.ingredients.map(x=>x.name||''),...(Array.isArray(r.allergens)?r.allergens:[])].join(' | ');
  if(terms.length&&conflicts(allergenText,terms)) return {ok:false,reason:'allergen_conflict',warnings:['Se descartó una receta incompatible con las alergias indicadas.']};
  const whole=[...r.ingredients.map(x=>x.name||''),...r.steps.map(x=>(x.title||'')+' '+(x.text||''))].join(' | ');
  if(ALCOHOL_RE.test(whole)) return {ok:false,reason:'alcohol_not_allowed',warnings:['Se descartó una receta que incluía alcohol.']};
  r.steps=r.steps.map(s=>({...s,title:String(s.title||'Paso'),text:String(s.text||''),requiresAdultSupervision:RISK_RE.test((s.title||'')+' '+(s.text||''))}));
  const hasPoultry=r.ingredients.some(i=>POULTRY_RE.test(i.name||''));
  if(hasPoultry&&!r.steps.some(s=>/74\s*°?C|completamente cocinad/i.test((s.title||'')+' '+(s.text||'')))) {
    r.steps[r.steps.length-1].text+=' Comprueba que el ave esté completamente cocinada; si usas termómetro, el centro debe alcanzar al menos 74 °C.';
    warnings.push('Se añadió una comprobación conservadora de cocción completa del ave.');
  }
  r.allergens=Array.isArray(r.allergens)?r.allergens:[]; r.servings=clamp(r.servings,1,24,2);
  if(ctx.budget!=null&&Number.isFinite(Number(r.estimatedCost))) r.withinBudget=Number(r.estimatedCost)<=Number(ctx.budget);
  r.safety=String(r.safety||'Mantén higiene de manos y utensilios; los menores requieren supervisión adulta para cuchillos, calor y aparatos eléctricos.');
  return {ok:true,recipe:r,warnings};
}
module.exports={validateRecipe,validateContext,generateFallback,adaptTechnique,norm};

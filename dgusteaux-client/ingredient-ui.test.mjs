import test from 'node:test';
import assert from 'node:assert/strict';
import {confidenceLabel,buildIngredientViewModel,buildSubstitutionViewModel} from './ingredient-ui.js';

test('confidence labels never promote low or unverified data',()=>{
  assert.equal(confidenceLabel('VERIFIED'),'✓ VERIFICADO');
  assert.equal(confidenceLabel('HIGH'),'ALTA CONFIANZA');
  assert.equal(confidenceLabel('MEDIUM'),'CONFIANZA MEDIA');
  assert.equal(confidenceLabel('LOW'),'DATO LIMITADO');
  assert.equal(confidenceLabel('UNVERIFIED'),'DATO LIMITADO');
});

test('ingredient view model exposes identity provenance seasonality allergens and uncertainty',()=>{
  const vm=buildIngredientViewModel({ok:true,ingredient:{id:'milk',canonicalName:'leche',category:'lácteo'},sources:[{id:'s',organization:'EUR-Lex',confidence:'VERIFIED',reviewedAt:'2026-09-01',current:true}],allergens:[{allergen:'milk',relation:'CONTAINS',confidence:'VERIFIED',sourceId:'s'}],seasonality:[],nutrition:[],sensory:{},functions:[],compatibility:[],warnings:['nutrition_not_verified']});
  assert.equal(vm.identity.name,'leche'); assert.equal(vm.provenance[0].organization,'EUR-Lex');
  assert.equal(vm.allergens[0].state,'CONTAINS'); assert.ok(vm.uncertainty.includes('nutrition_not_verified'));
});

test('substitution view exposes dimensions and explicit insufficient evidence',()=>{
  const vm=buildSubstitutionViewModel({ok:true,substitutes:[{id:'n',canonicalName:'naranja',safetyStatus:'insufficient_evidence',overallScore:78,scores:{culinaryFunction:80,flavor:75,texture:70,nutrition:70,approximateCost:80,availability:90,restrictionCompatibility:60},confidence:'MEDIUM',explanation:'citrus',caveats:'sweeter'}],warnings:['safety_evidence_required']});
  assert.equal(vm.items[0].dimensions.culinaryFunction,80); assert.equal(vm.items[0].safetyLabel,'EVIDENCIA INSUFICIENTE');
  assert.equal(vm.items[0].safe,false); assert.ok(vm.uncertainty.includes('safety_evidence_required'));
});

# GLOBAL INGREDIENT INTELLIGENCE v1 — Design Specification

Date: 2026-09-01
Project: D’GUSTEAUX
Branch: `dgusteaux-fallback`
Status: Design approved in chat; implementation not started

## 1. Objective

Build a new D’GUSTEAUX subsystem that gives MELO structured, sourced, region-aware ingredient intelligence. Version 1 starts with Spain while using a global-ready model so later expansion to Europe and worldwide regions does not require an architectural rewrite.

The subsystem must support the complete functional chain:

`search ingredient → open ingredient profile → inspect provenance → inspect seasonality → detect allergen/restriction conflicts → obtain safe substitute → explain substitution → adapt recipe → re-run Safety Gate`

This subsystem is not a decorative catalogue. It is an operational knowledge layer consumed by MELO, Pantry, Recipes, Substitution flows and the MELO Intelligence Cockpit.

## 2. Scope

### Included in v1
- Canonical ingredient catalogue.
- Multilingual and regional aliases.
- Sensory profile.
- Culinary functions and technique suitability.
- Allergen and restriction metadata.
- Normalized nutrition data.
- Spain-first seasonality with regional granularity.
- Ingredient compatibility relationships.
- Function-aware substitutions.
- Data provenance, versioning and confidence.
- Search and lookup RPCs.
- Ingredient analysis RPCs consumed by MELO.
- UI surfaces for search, ingredient profile, substitutions and confidence.
- Local/offline cache for recently used ingredients and saved recipes.

### Explicitly excluded from v1
- Live supermarket pricing.
- Live supplier inventory.
- Purchasing workflows.
- New paid AI providers.
- Repurposing shared Omegalli/CLINICAL Edge Functions.
- Autonomous publication of unverified scientific or safety data.

## 3. Architectural principles

1. **Spain-first, global-ready.** Initial verified content focuses on ingredients available in Spain. Territory modelling uses standard country/subdivision identifiers so new regions can be added without schema changes.
2. **No mega-table.** Identity, nutrition, allergens, seasonality, sensory properties, substitutions and provenance remain separate bounded domains.
3. **Provenance required.** Safety-, allergen- and nutrition-relevant facts are never presented as verified without an attributable source.
4. **Safety outranks optimization.** Allergies, dietary restrictions and existing D’GUSTEAUX Safety Gate rules always override preference, taste, cost and convenience.
5. **Unknown remains unknown.** Missing evidence is represented as `NULL` / `UNVERIFIED`; the system never invents data to fill gaps.
6. **Consumers use RPC contracts.** MELO and the browser client do not depend directly on table layouts.
7. **Isolation.** The subsystem lives in D’GUSTEAUX database objects and the `dgusteaux-fallback` branch. AppDeploy, `main`, KHAMINDRYA and unrelated shared systems are not modified by this work.

## 4. Data model

The implementation should use normalized tables in the `dgusteaux` schema.

### 4.1 `ingredients`
Canonical ingredient identity.

Minimum fields:
- `id uuid primary key`
- `canonical_name text`
- `scientific_name text null`
- `category text`
- `subcategory text null`
- `default_form text null`
- `origin_region text null`
- `active boolean`
- timestamps and revision metadata

Canonical identity must not depend on language or retailer naming.

### 4.2 `ingredient_aliases`
- ingredient id
- alias text
- language code
- country code nullable
- subdivision code nullable
- alias type: common / regional / scientific / commercial
- normalized search form

Duplicate normalized aliases inside the same language/territory context are prohibited.

### 4.3 `ingredient_sensory`
Numeric profile for relevant dimensions, using a consistent bounded scale.

Supported v1 dimensions:
- sweet
- salty
- acidic
- bitter
- umami
- fatty
- spicy
- astringent
- aromatic_intensity
- juicy
- crunchy
- creamy
- persistence

Not every ingredient requires every dimension. Missing values remain null.

### 4.4 `ingredient_functions`
Contextual culinary roles such as:
- structure
- binder
- thickener
- fat
- moisture
- acidity
- sweetness
- umami
- aroma
- leavening
- emulsification
- browning
- garnish

A single ingredient can have multiple functions with context and technique qualifiers.

### 4.5 `ingredient_allergens`
Each relation is explicitly typed:
- `CONTAINS`
- `MAY_CONTAIN`
- `CROSS_CONTACT_RISK`
- `UNKNOWN`

The model must not collapse possible traces into confirmed ingredient content.

### 4.6 `ingredient_nutrition`
Normalized values per 100 g or 100 ml.

Each measurement stores:
- nutrient key
- numeric value
- unit
- basis (`100g` or `100ml`)
- source reference
- source territory when relevant
- validity/review metadata

Negative nutrition values are invalid.

### 4.7 `ingredient_seasonality`
Territory-aware season information:
- country code
- subdivision code nullable
- month 1–12
- status: peak / in_season / shoulder / limited / unavailable / unknown
- production or market context when supported
- source reference

### 4.8 `ingredient_substitutions`
Directed relation from original ingredient to substitute.

Independent 0–100 scores:
- culinary_function
- flavor
- texture
- nutrition
- approximate_cost
- availability
- restriction_compatibility

Also store:
- technique context
- dish context
- explanation
- caveats
- source/confidence

Self-substitution is prohibited.

### 4.9 `ingredient_compatibility`
Canonical pair relation with a 0–100 score plus reason/context:
- aromatic affinity
- acid/fat balance
- umami reinforcement
- sweet/salty contrast
- texture contrast
- traditional pairing
- technique-specific compatibility

A↔B duplicate pairs are prohibited.

### 4.10 `ingredient_sources`
Source registry containing:
- source id
- source title
- source organization
- URL or source locator
- source class
- country/region
- accessed/reviewed dates
- confidence level
- active/current flag

Preferred source hierarchy for Spain:
1. public institutions and official databases;
2. recognized scientific/technical sources;
3. verified producer, DOP/IGP and sector sources;
4. commercial catalogues only for availability-type evidence, never as primary authority for safety or nutrition.

### 4.11 Audit/version history
Safety-, allergen-, nutrition-, seasonality- and substitution-relevant changes require append-only audit records identifying previous value, new value, source, revision and timestamp.

## 5. Confidence model

Allowed confidence values:
- `VERIFIED`
- `HIGH`
- `MEDIUM`
- `LOW`
- `UNVERIFIED`

Rules:
- `LOW` and `UNVERIFIED` are never rendered as established fact.
- Allergen and safety decisions require stricter evidence than ordinary culinary compatibility.
- If no sufficiently verified safe substitute exists, MELO must return that no verified substitution is available.

## 6. RPC boundary

Planned public D’GUSTEAUX contracts:

### `dgusteaux_search_ingredients(p_query, p_context)`
Returns canonical matches with alias match information, category, territory relevance and confidence.

### `dgusteaux_get_ingredient(p_ingredient_id, p_context)`
Returns the complete user-facing profile: identity, sensory information, uses, nutrition, allergens, seasonality, compatibility, provenance and confidence.

### `dgusteaux_suggest_substitutes(p_ingredient_id, p_context)`
Returns ranked substitutions after applying allergy/restriction filters. Must expose independent score dimensions and explanation.

### `dgusteaux_analyze_ingredients(p_ingredients, p_context)`
Normalizes recipe ingredients, maps culinary functions, highlights unresolved items and returns safety/restriction findings.

### `dgusteaux_get_seasonal_ingredients(p_context)`
Returns seasonally relevant ingredients for the requested territory and month.

These contracts should use SECURITY INVOKER and least privilege. Authentication requirements should follow existing D’GUSTEAUX patterns; no public write access is introduced.

## 7. MELO decision flow

For recipe generation or correction:

1. Normalize ingredient names to canonical ids.
2. Resolve aliases/language/region.
3. Apply Safety Gate and explicit allergies/restrictions before optimization.
4. Build a sensory and culinary-function profile.
5. Prefer pantry ingredients and regionally appropriate seasonal items.
6. Rank substitutions by function, flavor, texture, safety, nutrition, seasonality and availability.
7. Explain every meaningful substitution or correction.
8. Rebuild the candidate recipe only with allowed changes.
9. Re-run `dgusteaux_validate_recipe` before returning the result.

MELO must never silently replace an ingredient when the replacement could change allergen or restriction status.

Preference adaptation may alter technique or select among already-safe candidates, but may not override safety constraints.

## 8. Contextual compatibility

Compatibility is contextual, not universally binary. The same ingredient pair may score differently depending on technique or culinary function. Substitution evaluation must therefore support optional technique/dish context instead of relying on one global score.

## 9. User interface

### Global ingredient search
Available from Search, Pantry, Recipe, Substitute and MELO Intelligence Cockpit.

Search supports:
- aliases and regional names
- multilingual names
- reasonable spelling variation
- category filters
- season filters
- dietary restrictions
- allergens
- sensory profile
- regional relevance

### Ingredient profile
Sections:
- Identity
- Sensory profile
- Culinary uses
- Compatibility
- Substitutions
- Nutrition
- Allergens/restrictions
- Seasonality
- Provenance/confidence

Substitution UI exposes multidimensional scoring rather than only a single opaque number.

### Pantry integration
Recipe analysis can summarize states such as:
`5 EN CASA · 2 SUSTITUIBLES · 1 FALTA`

If a safe substitute is already in the pantry, MELO may offer a validated adapted recipe.

### Confidence UI
Human-readable labels:
- ✓ VERIFICADO
- ALTA CONFIANZA
- CONFIANZA MEDIA
- DATO LIMITADO

Unverified safety information must remain visibly unverified.

### Visual language
Reuse the established D’GUSTEAUX/MELO dark, translucent, premium visual system. Scientific information should be legible and hierarchical, not visually overloaded.

## 10. Localization and expansion

Territory hierarchy supports global country and subdivision codes.

Initial rollout:
- ES-1: foundational ingredients available in Spain
- ES-2: regional Spanish products, DOP/IGP and territorial seasonality
- EU-1: Portugal, France, Italy
- EU-2: remaining Europe
- GLOBAL-1: Latin America, Caribbean, North America, Asia, Africa and Middle East by validated regional datasets

Expansion adds content, not a new architecture.

## 11. Offline and performance

The browser must not download the global catalogue.

Use indexed queries and bounded RPC responses for:
- search results
- selected ingredient profile
- requested relationships
- regional seasonality

Offline mode stores only a bounded cache of recently used ingredients and ingredient data required by saved recipes. Cache content must preserve source/confidence metadata.

## 12. Error handling

Expected explicit outcomes include:
- ingredient not resolved
- ambiguous alias
- missing verified nutrition
- missing verified allergen information
- no safe substitute
- region not yet covered
- source data stale or superseded

Errors and uncertainty are returned as structured data; the UI must not convert uncertainty into certainty.

## 13. Security and data quality

- No unsafe culinary practice may be introduced by substitution or adaptation.
- Existing adult-supervision warnings for knife, heat, oven, hot oil or similar risk remain in force.
- No new shared Edge Function is required for v1.
- Write operations for catalogue curation are not exposed to ordinary authenticated users.
- Read RPCs expose only the fields needed by the client.
- RLS, explicit grants and function execution permissions must be tested.

## 14. Testing strategy

Implementation follows TDD.

Required layers:
- schema constraint tests
- RPC permission tests
- canonical/alias search tests
- source/confidence tests
- allergen conflict tests
- substitution ranking tests
- seasonality territory tests
- MELO integration tests
- offline cache tests
- browser rendering tests
- regression tests ensuring existing recipe generation and Safety Gate remain intact

The acceptance E2E culinary scenario is:

`search ingredient → ingredient profile → provenance → seasonality → allergen detection → safe substitute → substitution explanation → recipe adaptation → Safety Gate success`

No claim of E2E success is allowed unless that exact scenario has been executed and passed.

## 15. Definition of Done for v1

v1 is complete only when:
- the normalized schema exists and constraints are active;
- initial Spain dataset is loaded from traceable sources;
- all planned read/analyze RPCs are implemented with tested permissions;
- MELO consumes ingredient intelligence without direct table coupling;
- UI search/profile/substitution flows are functional;
- uncertainty and provenance are visible;
- safe substitution cannot bypass allergies/restrictions;
- the E2E culinary acceptance scenario passes;
- existing D’GUSTEAUX recipe generation, Cockpit and Safety Gate regressions remain green;
- AppDeploy, `main`, KHAMINDRYA and unrelated shared systems remain untouched unless separately authorized.

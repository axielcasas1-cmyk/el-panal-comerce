# GLOBAL INGREDIENT INTELLIGENCE v1 — Design Specification

Date: 2026-09-01
Project: D’GUSTEAUX
Branch: `dgusteaux-fallback`
Status: Design approved in chat; implementation not started

## 1. Objective

Build a D’GUSTEAUX subsystem that gives MELO structured, sourced and region-aware ingredient intelligence. Version 1 starts with Spain but uses a global-ready model so later expansion to Europe and worldwide regions does not require an architectural rewrite.

Required functional chain:

`search ingredient → ingredient profile → provenance → seasonality → allergen/restriction detection → safe substitute → explanation → recipe adaptation → Safety Gate`

This is an operational knowledge layer consumed by MELO, Pantry, Recipes, substitution flows and the MELO Intelligence Cockpit, not a decorative catalogue.

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
- Ingredient search, lookup, analysis, substitution and seasonality RPCs.
- UI for search, ingredient profile, substitutions and confidence.
- Bounded local/offline cache for recent ingredients and saved recipes.

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
4. **Safety outranks optimization.** Allergies, dietary restrictions and existing D’GUSTEAUX Safety Gate rules override preference, taste, cost and convenience.
5. **Unknown remains unknown.** Missing evidence is represented as `NULL` / `UNVERIFIED`; the system never invents data to fill gaps.
6. **Consumers use RPC contracts.** MELO and the browser client do not depend directly on table layouts.
7. **Isolation.** The subsystem lives in D’GUSTEAUX database objects and the `dgusteaux-fallback` branch. AppDeploy, `main`, KHAMINDRYA and unrelated shared systems are not modified by this work.

## 4. Data model

Use normalized tables in the `dgusteaux` schema.

### 4.1 `ingredients`
Canonical identity with at least:
- `id uuid primary key`
- `canonical_name text`
- `scientific_name text null`
- `category text`
- `subcategory text null`
- `default_form text null`
- `origin_region text null`
- `active boolean`
- timestamps and revision metadata

Canonical identity does not depend on language or retailer naming.

### 4.2 `ingredient_aliases`
Fields include ingredient id, alias, language code, optional country/subdivision, alias type (`common`, `regional`, `scientific`, `commercial`) and normalized search form. Duplicate normalized aliases inside the same language/territory context are prohibited.

### 4.3 `ingredient_sensory`
Use a consistent bounded scale for:
`sweet, salty, acidic, bitter, umami, fatty, spicy, astringent, aromatic_intensity, juicy, crunchy, creamy, persistence`.

Missing dimensions remain null.

### 4.4 `ingredient_functions`
Contextual roles include:
`structure, binder, thickener, fat, moisture, acidity, sweetness, umami, aroma, leavening, emulsification, browning, garnish`.

One ingredient may have multiple roles with technique/context qualifiers.

### 4.5 `ingredient_allergens`
Every relation is explicitly typed:
- `CONTAINS`
- `MAY_CONTAIN`
- `CROSS_CONTACT_RISK`
- `UNKNOWN`

Possible traces must never be collapsed into confirmed content.

### 4.6 `ingredient_nutrition`
Measurements are normalized per `100g` or `100ml` and store nutrient key, value, unit, basis, source reference, source territory when relevant, validity and review metadata. Negative values are invalid.

### 4.7 `ingredient_seasonality`
Store country, optional subdivision, month 1–12, status (`peak`, `in_season`, `shoulder`, `limited`, `unavailable`, `unknown`), production/market context when supported, source and review metadata.

### 4.8 `ingredient_substitutions`
Directed original→substitute relation with independent 0–100 scores for:
- culinary_function
- flavor
- texture
- nutrition
- approximate_cost
- availability
- restriction_compatibility

Also store technique context, dish context, explanation, caveats, source and confidence. Self-substitution is prohibited.

### 4.9 `ingredient_compatibility`
Canonical pair relation with 0–100 score, reason and context such as aromatic affinity, acid/fat balance, umami reinforcement, sweet/salty contrast, texture contrast, traditional pairing or technique-specific compatibility. Duplicate A↔B pairs are prohibited.

### 4.10 `ingredient_sources`
Source registry stores source id, title, organization, locator/URL, source class, territory, accessed/reviewed dates, confidence and active/current state.

Preferred source hierarchy for Spain:
1. public institutions and official databases;
2. recognized scientific/technical sources;
3. verified producer, DOP/IGP and sector sources;
4. commercial catalogues only for availability evidence, never as primary authority for safety or nutrition.

### 4.11 Audit/version history
Safety-, allergen-, nutrition-, seasonality- and substitution-relevant changes require append-only audit records identifying previous value, new value, source, revision and timestamp.

## 5. Confidence and safety evidence model

Allowed confidence values:
- `VERIFIED`
- `HIGH`
- `MEDIUM`
- `LOW`
- `UNVERIFIED`

Rules:
- `LOW` and `UNVERIFIED` are never rendered as established fact.
- Ordinary culinary compatibility may expose `MEDIUM` data with an explicit confidence label.
- A substitution may be presented as **verified safe for a declared allergy/restriction only when the evidence covering that specific allergen/restriction for the proposed substitute is `VERIFIED` or `HIGH`**.
- Absence of allergen data is not evidence of safety.
- If relevant evidence is `MEDIUM`, `LOW`, `UNVERIFIED` or missing, MELO must not label the substitute safe and must return a structured `insufficient_safety_evidence` outcome.
- Safety and allergen evidence outrank substitution score, palate, cost, seasonality and convenience.

## 6. RPC boundary and permissions

Planned D’GUSTEAUX contracts:

### `dgusteaux_search_ingredients(p_query, p_context)`
Canonical matches with alias match data, category, territorial relevance and confidence.

### `dgusteaux_get_ingredient(p_ingredient_id, p_context)`
User-facing profile containing identity, sensory data, uses, nutrition, allergens, seasonality, compatibility, provenance and confidence.

### `dgusteaux_suggest_substitutes(p_ingredient_id, p_context)`
Ranked substitutes after allergy/restriction safety filtering; exposes independent score dimensions, confidence, explanation and caveats.

### `dgusteaux_analyze_ingredients(p_ingredients, p_context)`
Normalizes recipe ingredients, maps functions, highlights unresolved items and returns safety/restriction findings.

### `dgusteaux_get_seasonal_ingredients(p_context)`
Seasonally relevant ingredients for requested territory/month.

Permission contract for v1:
- all ingredient-intelligence RPCs use `SECURITY INVOKER`;
- `authenticated=true` and `service_role=true` as appropriate;
- `anon=false` and `public=false` for execution;
- ordinary authenticated users receive read/analyze behavior only;
- catalogue curation writes are never exposed through these client RPCs;
- RLS and explicit EXECUTE grants are tested.

## 7. MELO decision flow

For generation or correction:
1. Normalize ingredient names to canonical ids.
2. Resolve aliases, language and region.
3. Apply Safety Gate plus explicit allergies/restrictions before optimization.
4. Build sensory and culinary-function profiles.
5. Prefer pantry ingredients and regionally appropriate seasonal items.
6. Rank only safety-eligible substitutes by function, flavor, texture, nutrition, seasonality and availability.
7. Explain every meaningful substitution/correction.
8. Rebuild the candidate only with permitted changes.
9. Re-run `dgusteaux_validate_recipe` before returning the result.

MELO never silently replaces an ingredient when allergen/restriction status could change. Preference adaptation can alter technique or select among already-safe candidates but cannot override safety.

## 8. Contextual compatibility

Compatibility is contextual, not universally binary. Pair scores may vary by technique or culinary function. Substitution evaluation supports optional technique/dish context rather than relying on one global score.

## 9. User interface

### Global ingredient search
Available from Search, Pantry, Recipe, Substitute and MELO Intelligence Cockpit. Supports aliases/regional names, multilingual names, reasonable spelling variation, category, season, dietary restrictions, allergens, sensory profile and regional relevance.

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

Substitution UI exposes multidimensional scoring instead of only one opaque number.

### Pantry integration
Recipe analysis can summarize states such as:
`5 EN CASA · 2 SUSTITUIBLES · 1 FALTA`.

If a safety-eligible substitute is already in the pantry, MELO may offer a newly validated adapted recipe.

### Confidence UI
Human labels:
- ✓ VERIFICADO
- ALTA CONFIANZA
- CONFIANZA MEDIA
- DATO LIMITADO

Unverified safety information remains visibly unverified.

### Visual language
Reuse the established D’GUSTEAUX/MELO dark, translucent premium system. Scientific information is hierarchical and legible rather than visually overloaded.

## 10. Localization and expansion

Territory hierarchy uses global country and subdivision codes.

Rollout sequence:
- ES-1: foundational ingredients available in Spain
- ES-2: regional Spanish products, DOP/IGP and territorial seasonality
- EU-1: Portugal, France, Italy
- EU-2: remaining Europe
- GLOBAL-1: Latin America, Caribbean, North America, Asia, Africa and Middle East by validated regional datasets

Expansion adds content, not a new architecture.

## 11. Offline and performance

The browser never downloads the global catalogue. Use indexed queries and bounded RPC responses for search, selected profiles, requested relationships and regional seasonality.

Offline mode stores only a bounded cache of recently used ingredients and ingredient data required by saved recipes. Cached data preserves source, confidence and review metadata so stale/uncertain data cannot masquerade as current verified data.

## 12. Structured uncertainty and errors

Explicit outcomes include:
- `ingredient_not_resolved`
- `ambiguous_alias`
- `nutrition_not_verified`
- `allergen_evidence_missing`
- `insufficient_safety_evidence`
- `no_safe_substitute`
- `region_not_covered`
- `source_stale_or_superseded`

The UI must not convert uncertainty into certainty.

## 13. Security and data quality

- No unsafe culinary practice may be introduced by substitution/adaptation.
- Existing adult-supervision warnings for knife, heat, oven, hot oil or similar risk remain in force.
- No new shared Edge Function is required for v1.
- Catalogue curation writes are not exposed to ordinary authenticated users.
- Read RPCs expose only fields needed by the client.
- RLS, grants and execution permissions are tested.

## 14. Testing strategy

Implementation follows TDD.

Required layers:
- schema constraint tests
- RPC permission tests
- canonical/alias search tests
- provenance/confidence tests
- allergen evidence tests
- substitution ranking and abstention tests
- seasonality territory tests
- MELO integration tests
- offline cache tests
- browser rendering tests
- regression tests for recipe generation and Safety Gate

Acceptance E2E culinary scenario:

`search ingredient → ingredient profile → provenance → seasonality → allergen detection → safe substitute → substitution explanation → recipe adaptation → Safety Gate success`

No E2E success claim is allowed unless that exact scenario has been executed and passed.

## 15. Definition of Done for v1

v1 is complete only when:
- normalized schema and constraints are active;
- initial Spain dataset is loaded from traceable sources;
- all planned RPCs are implemented with tested permissions;
- MELO consumes intelligence without direct table coupling;
- UI search/profile/substitution flows are functional;
- uncertainty and provenance are visible;
- substitutions cannot bypass allergies/restrictions or insufficient evidence;
- the E2E culinary acceptance scenario passes;
- existing D’GUSTEAUX recipe generation, Cockpit and Safety Gate regressions remain green;
- AppDeploy, `main`, KHAMINDRYA and unrelated shared systems remain untouched unless separately authorized.

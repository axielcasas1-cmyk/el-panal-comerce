# GLOBAL INGREDIENT INTELLIGENCE v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Spain-first, globally extensible ingredient intelligence subsystem that lets MELO search, explain, substitute and validate ingredients with explicit provenance, confidence and allergen safety.

**Architecture:** Add normalized D’GUSTEAUX-owned tables and authenticated SECURITY INVOKER RPCs in Supabase; keep Spanish seed data in versioned, source-backed files; expose the subsystem through small browser modules for RPC access, offline cache and UI. Ingredient-aware safety evidence is introduced through a separate versioned Safety Gate bridge migration; every adapted recipe still passes `dgusteaux_validate_recipe`.

**Tech Stack:** PostgreSQL/Supabase, PL/pgSQL, vanilla ES modules, Node `node:test`, static single-file D’GUSTEAUX build packaged as gzip/base64 for the isolated Vercel preview.

**Spec:** `docs/superpowers/specs/2026-09-01-global-ingredient-intelligence-v1-design.md`

## Global Constraints

- Spain-first content; country/subdivision model remains global-ready.
- `LOW` and `UNVERIFIED` are never rendered as established fact.
- A substitute is called safe for a declared allergy/restriction only with `VERIFIED` or `HIGH` evidence for that exact condition.
- Missing allergen evidence is never evidence of safety.
- Ingredient RPCs: `authenticated=true`, `service_role=true`, `anon=false`, `public=false`.
- Catalogue writes are not exposed to ordinary users.
- No paid AI provider or shared Omegalli/CLINICAL Edge Function.
- AppDeploy source, `main`, KHAMINDRYA and unrelated systems remain untouched.
- Existing adult-supervision warnings for knife/heat/oven/hot-oil risks remain mandatory.
- No E2E claim unless the exact culinary acceptance chain is executed.

## File Structure

- Create `dgusteaux-db/migrations/20260901_001_global_ingredient_schema.sql` — schema, constraints, RLS, audit.
- Create `dgusteaux-db/migrations/20260901_002_global_ingredient_rpcs.sql` — search/profile/seasonality/substitution/analyze RPCs and grants.
- Create `dgusteaux-db/migrations/20260901_003_global_ingredient_seed_es.sql` — idempotent reviewed ES-1 seed.
- Create `dgusteaux-db/migrations/20260901_004_global_ingredient_safety_bridge.sql` — versioned replacement of the existing Safety Gate with canonical ingredient evidence added, preserving all current checks.
- Create `dgusteaux-data/es-foundation-v1.json` — canonical ingredient data.
- Create `dgusteaux-data/es-foundation-v1.sources.json` — source registry/review metadata.
- Create `dgusteaux-data/es-foundation-v1.test.mjs` — deterministic dataset validation.
- Create `dgusteaux-client/ingredient-intelligence.js` and `.test.mjs` — RPC adapter.
- Create `dgusteaux-client/ingredient-cache.js` and `.test.mjs` — bounded cache.
- Create `dgusteaux-client/ingredient-ui.js` and `.test.mjs` — UI view models/render helpers.
- Modify `dgusteaux-client/melo-intelligence.js` and `.test.mjs` — optional enrichment without breaking existing fallback.
- Create `khamindrya-ionos/payload/ingredient-v1.txt`; modify `khamindrya-ionos/index.html` only after payload integrity passes.

---

### Task 1: Normalized Ingredient Schema and Quality Constraints

**Files:**
- Create: `dgusteaux-db/migrations/20260901_001_global_ingredient_schema.sql`

**Interfaces:**
- Produces: `ingredients`, `ingredient_aliases`, `ingredient_sensory`, `ingredient_functions`, `ingredient_allergens`, `ingredient_nutrition`, `ingredient_seasonality`, `ingredient_substitutions`, `ingredient_compatibility`, `ingredient_sources`, `ingredient_change_log`.

- [ ] **Step 1: RED — prove schema is absent**

```sql
select to_regclass('dgusteaux.ingredients') is not null as ingredients_exists,
       to_regclass('dgusteaux.ingredient_sources') is not null as sources_exists,
       to_regclass('dgusteaux.ingredient_substitutions') is not null as substitutions_exists;
```
Expected: all `false`.

- [ ] **Step 2: Implement canonical tables and checks**

Core identity shape:

```sql
create table dgusteaux.ingredients(
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  scientific_name text,
  category text not null,
  subcategory text,
  default_form text,
  origin_region text,
  active boolean not null default true,
  revision bigint not null default 1 check(revision>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lower(canonical_name),coalesce(default_form,''))
);
```

Required checks in the same migration: sensory `0..5`; confidence enum `VERIFIED/HIGH/MEDIUM/LOW/UNVERIFIED`; relationship scores `0..100`; season month `1..12`; nutrition value `>=0`; allergen relation enum; `original_ingredient_id<>substitute_ingredient_id`; canonical compatibility ordering `ingredient_a_id<ingredient_b_id`.

- [ ] **Step 3: Add append-only audit and RLS**

`ingredient_change_log` stores `entity_type`, `entity_id`, `previous_value`, `new_value`, `source_id`, `revision`, `changed_at`. Enable RLS on all new catalogue tables. Revoke INSERT/UPDATE/DELETE from `anon` and `authenticated` only on the new tables; do not alter grants for pre-existing D’GUSTEAUX tables.

- [ ] **Step 4: GREEN — transactional constraint suite**

Inside `begin; ... rollback;`, assert valid rows insert and each invalid case fails independently: negative nutrient, month 13, score 101, self-substitution, reversed compatibility pair.

- [ ] **Step 5: Commit**

```bash
git add dgusteaux-db/migrations/20260901_001_global_ingredient_schema.sql
git commit -m "feat: add ingredient intelligence schema"
```

---

### Task 2: Authenticated Ingredient RPC Boundary

**Files:**
- Create: `dgusteaux-db/migrations/20260901_002_global_ingredient_rpcs.sql`

**Interfaces:**
- Produces:
  - `dgusteaux_search_ingredients(text,jsonb)`
  - `dgusteaux_get_ingredient(uuid,jsonb)`
  - `dgusteaux_get_seasonal_ingredients(jsonb)`
  - `dgusteaux_suggest_substitutes(uuid,jsonb)`
  - `dgusteaux_analyze_ingredients(jsonb,jsonb)`

- [ ] **Step 1: RED — functions absent and anon unusable**

```sql
select to_regprocedure('public.dgusteaux_search_ingredients(text,jsonb)') is not null;
```
Expected: `false`.

- [ ] **Step 2: Implement normalized search**

Require `auth.uid()`. Query max 120 chars; return max 20. Normalize with the same accent fold everywhere:

```sql
translate(lower(trim(v)),'áéíóúüñ','aeiouun')
```

Return `id`, `canonicalName`, `category`, `matchedBy`, `matchedAlias`, `language`, `country`, `subdivision`, `confidence`.

- [ ] **Step 3: Implement profile and seasonality**

`dgusteaux_get_ingredient` returns exactly:

```json
{"ok":true,"ingredient":{},"aliases":[],"sensory":{},"functions":[],"nutrition":[],"allergens":[],"seasonality":[],"compatibility":[],"sources":[],"warnings":[]}
```

Seasonality context uses `country`, optional `subdivision`, `month`; exact subdivision wins, then country fallback. No record returns `region_not_covered`.

- [ ] **Step 4: Implement safety-first substitute ranking**

Order is fixed: allergy/restriction eligibility → evidence threshold → conflict rejection → ranking. Candidate safety status can be `safe`, `unsafe`, or `insufficient_evidence`. Only `VERIFIED/HIGH` relevant evidence can produce `safe` for a declared condition.

- [ ] **Step 5: Implement ingredient analysis**

Return:

```json
{"ok":true,"resolved":[],"unresolved":[],"safetyFindings":[],"functions":[],"pantrySummary":{"atHome":0,"substitutable":0,"missing":0},"warnings":[]}
```

Ambiguous aliases return `ambiguous_alias`; missing safety evidence returns `insufficient_safety_evidence`.

- [ ] **Step 6: Apply least privilege and GREEN permissions**

For every new function:

```sql
revoke all on function public.dgusteaux_search_ingredients(text,jsonb) from public, anon;
grant execute on function public.dgusteaux_search_ingredients(text,jsonb) to authenticated, service_role;
```

Repeat with exact signatures. Verify `has_function_privilege('authenticated',...,'EXECUTE')=true` and `anon=false`.

- [ ] **Step 7: Commit**

```bash
git add dgusteaux-db/migrations/20260901_002_global_ingredient_rpcs.sql
git commit -m "feat: add ingredient intelligence RPCs"
```

---

### Task 3: Reviewed ES-1 Foundation Dataset

**Files:**
- Create: `dgusteaux-data/es-foundation-v1.json`
- Create: `dgusteaux-data/es-foundation-v1.sources.json`
- Create: `dgusteaux-data/es-foundation-v1.test.mjs`
- Create: `dgusteaux-db/migrations/20260901_003_global_ingredient_seed_es.sql`

**Interfaces:**
- Produces a small, traceable acceptance dataset used by all later tests.

- [ ] **Step 1: RED dataset validator**

Create `es-foundation-v1.test.mjs` with assertions that fail while files are absent, then enforce:

```js
assert.equal(new Set(data.ingredients.map(x=>x.key)).size,data.ingredients.length);
for(const row of data.claims){
  assert.ok(sources[row.sourceKey]);
  assert.ok(['VERIFIED','HIGH','MEDIUM','LOW','UNVERIFIED'].includes(row.confidence));
}
```

Also assert months `1..12`, numeric values non-negative, and every allergen/nutrition/seasonality claim has a source.

- [ ] **Step 2: Create bounded acceptance cohort**

Seed exactly these canonical records first: `tomate`, `cebolla`, `ajo`, `arroz`, `pollo`, `limón`, `garbanzo`, `leche`, `huevo`, `cacahuete`, `trigo`, `almendra`, `aceite de oliva`, `pimiento`, `manzana`, `naranja`.

- [ ] **Step 3: Populate source registry conservatively**

Use reviewed records from:
- BEDCA/AESAN for Spanish composition data, preserving attribution and usage conditions;
- AESAN material aligned with Regulation (EU) 1169/2011 Annex II for allergen classes;
- MAPA seasonal fruit/vegetable guidance/calendars for Spain.

Do not create a claim the selected source does not substantiate. Store locator, organization, accessed/reviewed date, source class and confidence in `es-foundation-v1.sources.json`.

- [ ] **Step 4: GREEN dataset validation**

```bash
node --test dgusteaux-data/es-foundation-v1.test.mjs
```
Expected: zero failures.

- [ ] **Step 5: Generate idempotent seed SQL**

Use stable text keys from JSON to resolve UUIDs; use `insert ... on conflict ... do update` only for curated rows. Generated SQL must preserve source/review metadata and must not synthesize missing claims.

- [ ] **Step 6: GREEN DB acceptance data**

Verify: `garbanzo` searchable; milk has explicit milk allergen evidence; peanut has explicit peanut evidence; tomato has source-backed Spain seasonality; every returned scientific/safety claim carries source/confidence.

- [ ] **Step 7: Commit**

```bash
git add dgusteaux-data dgusteaux-db/migrations/20260901_003_global_ingredient_seed_es.sql
git commit -m "feat: seed reviewed Spain ingredient foundation"
```

---

### Task 4: Versioned Ingredient-Aware Safety Gate Bridge

**Files:**
- Create: `dgusteaux-db/migrations/20260901_004_global_ingredient_safety_bridge.sql`

**Interfaces:**
- Consumes Task 2 `dgusteaux_analyze_ingredients`.
- Replaces the body, not the signature, of existing `public.dgusteaux_validate_recipe(jsonb,jsonb)`.
- Preserves every existing structural, poultry, dangerous-operation and adult-supervision rule.

- [ ] **Step 1: RED — canonical allergen evidence not yet enforced**

Using an authenticated synthetic user, create a recipe containing an alias/canonical ingredient whose allergen conflict is represented only in the new catalogue. Expect current validator to miss that catalogue-specific conflict; record this as RED evidence.

- [ ] **Step 2: Implement the bridge without weakening existing checks**

At the start of validation, call canonical ingredient analysis on recipe ingredients and merge only source-backed safety findings into the existing error set. Required behavior:

```text
conflict + VERIFIED/HIGH evidence -> reject
missing relevant evidence -> warning/error code insufficient_safety_evidence when user declared that condition
no declared condition -> do not invent an allergy
```

Then continue all pre-existing textual checks and supervision tagging unchanged.

- [ ] **Step 3: GREEN safety regression matrix**

Required cases: catalogue allergen conflict rejected; `MEDIUM`/missing safety evidence not marked safe; existing peanut text conflict still rejected; incomplete poultry still rejected; safe poultry accepted; knife flag true; heat flag true.

- [ ] **Step 4: Commit**

```bash
git add dgusteaux-db/migrations/20260901_004_global_ingredient_safety_bridge.sql
git commit -m "feat: bridge ingredient evidence into Safety Gate"
```

---

### Task 5: Browser Adapter and Bounded Offline Cache

**Files:**
- Create: `dgusteaux-client/ingredient-intelligence.js`
- Create: `dgusteaux-client/ingredient-intelligence.test.mjs`
- Create: `dgusteaux-client/ingredient-cache.js`
- Create: `dgusteaux-client/ingredient-cache.test.mjs`

**Interfaces:**
- Adapter exports `searchIngredients`, `getIngredientProfile`, `suggestSubstitutes`, `analyzeIngredients`, `getSeasonalIngredients`.
- Cache exports `getCachedIngredient`, `putCachedIngredient`, `pruneIngredientCache`.

- [ ] **Step 1: RED adapter tests**

Test no module/function, then authenticated success, no-session result, RPC error, malformed response and structured uncertainty preservation.

- [ ] **Step 2: Implement guarded adapter**

Each method returns `{ok,data,warnings,reason}`. No method turns `insufficient_safety_evidence`, `ambiguous_alias` or other uncertainty into success.

- [ ] **Step 3: RED cache tests**

Assert source/confidence/reviewedAt preservation, max 50 records, oldest eviction and stale labeling.

- [ ] **Step 4: Implement cache**

Use IndexedDB in browser and in-memory adapter in test/non-browser context. Reject caching a profile that lacks provenance/confidence metadata.

- [ ] **Step 5: GREEN**

```bash
node --test dgusteaux-client/ingredient-intelligence.test.mjs
node --test dgusteaux-client/ingredient-cache.test.mjs
node --check dgusteaux-client/ingredient-intelligence.js
node --check dgusteaux-client/ingredient-cache.js
```
Expected: zero failures.

- [ ] **Step 6: Commit**

```bash
git add dgusteaux-client/ingredient-intelligence* dgusteaux-client/ingredient-cache*
git commit -m "feat: add ingredient intelligence browser client"
```

---

### Task 6: Ingredient UI and MELO Context Enrichment

**Files:**
- Create: `dgusteaux-client/ingredient-ui.js`
- Create: `dgusteaux-client/ingredient-ui.test.mjs`
- Modify: `dgusteaux-client/melo-intelligence.js`
- Modify: `dgusteaux-client/melo-intelligence.test.mjs`

**Interfaces:**
- UI consumes Task 5 adapter only; never direct tables.
- MELO accepts optional `ingredientIntelligence` dependency.

- [ ] **Step 1: RED UI tests**

Require view models to expose identity, confidence badge, provenance, seasonality, allergen state, substitution dimension scores and explicit uncertainty.

- [ ] **Step 2: Implement pure UI helpers**

```js
export function confidenceLabel(level){
  return ({VERIFIED:'✓ VERIFICADO',HIGH:'ALTA CONFIANZA',MEDIUM:'CONFIANZA MEDIA',LOW:'DATO LIMITADO',UNVERIFIED:'DATO LIMITADO'})[level]||'DATO LIMITADO';
}
export function buildIngredientViewModel(profile){}
export function buildSubstitutionViewModel(result){}
```

The completed functions must never hide low/unverified safety confidence.

- [ ] **Step 3: RED MELO regression/enrichment**

Existing five `melo-intelligence` tests remain required. Add: resolved ingredient context reaches server `p_context.ingredientIntelligence`; analysis failure preserves current generation/fallback behavior.

- [ ] **Step 4: Implement optional enrichment**

Before server generation, if `ingredientIntelligence?.analyzeIngredients` exists and returns `ok=true`, attach only the returned structured analysis to `p_context.ingredientIntelligence`. Otherwise send the original context unchanged. Do not block local generation.

- [ ] **Step 5: GREEN**

```bash
node --test dgusteaux-client/ingredient-ui.test.mjs
node --test dgusteaux-client/melo-intelligence.test.mjs
node --check dgusteaux-client/ingredient-ui.js
node --check dgusteaux-client/melo-intelligence.js
```

- [ ] **Step 6: Commit**

```bash
git add dgusteaux-client/ingredient-ui* dgusteaux-client/melo-intelligence*
git commit -m "feat: integrate ingredient intelligence with MELO UI"
```

---

### Task 7: Static Integration, Exact Culinary E2E and Release Registry

**Files:**
- Create: `khamindrya-ionos/payload/ingredient-v1.txt`
- Modify: `khamindrya-ionos/index.html`
- DB metadata: `dgusteaux.release_registry` after all gates pass.

**Interfaces:**
- Produces the protected technical preview on `dgusteaux-fallback` only.

- [ ] **Step 1: Integrate the UI into the verified single-file build**

Add entry points from Search, Pantry, Recipe, Substitute and MELO Cockpit. Preserve recipe generation, ratings, save, sync, Cockpit and safety behavior.

- [ ] **Step 2: RED/GREEN static UI assertions and JS syntax**

Before integration, assertions for ingredient search/profile/substitution controls fail. After integration they pass. Extract inline JS and run `node --check` with exit 0.

- [ ] **Step 3: Package and prove byte integrity**

Gzip the final HTML, base64 into `ingredient-v1.txt`, reconstruct locally and verify:

```text
sha256(reconstructed_html) == sha256(source_html)
```

Do not change the launcher until this passes.

- [ ] **Step 4: Switch isolated launcher atomically**

Update only `khamindrya-ionos/index.html` to fetch `./payload/ingredient-v1.txt`; preserve the AppDeploy fallback URL.

- [ ] **Step 5: Execute exact authenticated culinary E2E**

Run and record every stage:

`search ingredient → ingredient profile → provenance → seasonality → allergen detection → safe substitute → substitution explanation → recipe adaptation → dgusteaux_validate_recipe success`

If any stage is absent/fails, E2E status is not passed.

- [ ] **Step 6: Full continuity gate**

Verify all ingredient RPCs `authenticated=true`, `anon=false`; existing generator, quick-adjustment, Safety Gate, save/sync/rating regressions green; Vercel branch `READY` with no build errors; AppDeploy still `ready` and report `e2e_tests` truthfully; shared Omegalli/CLINICAL Edge Functions unchanged by this work; `main` untouched.

- [ ] **Step 7: Register release only after all gates pass**

Set Supabase source version to `rpc-v1-global-ingredient-intelligence`, Vercel fallback to final isolated commit, and include payload SHA plus exact E2E outcome in notes.

- [ ] **Step 8: Commit**

```bash
git add khamindrya-ionos/index.html khamindrya-ionos/payload/ingredient-v1.txt
git commit -m "feat: activate Global Ingredient Intelligence v1 preview"
```

## Final Verification Checklist

- [ ] Invalid nutrition, seasonality and relationship values are rejected by DB constraints.
- [ ] ES-1 seed claims are source-backed and carry confidence.
- [ ] Search/profile/seasonality/substitution/analyze RPCs are auth-only.
- [ ] Safety eligibility always precedes substitute ranking.
- [ ] Missing relevant safety evidence returns `insufficient_safety_evidence`.
- [ ] Safety Gate preserves existing rules and adds canonical evidence checks.
- [ ] MELO consumes intelligence without direct table coupling.
- [ ] UI preserves uncertainty and provenance.
- [ ] Offline cache preserves source/confidence and is bounded to 50 profiles.
- [ ] Exact culinary E2E chain passes before any E2E-success claim.
- [ ] Existing MELO/Cockpit/Safety Gate regressions remain green.
- [ ] No shared Edge Function, AppDeploy source, `main`, KHAMINDRYA or unrelated system is modified.

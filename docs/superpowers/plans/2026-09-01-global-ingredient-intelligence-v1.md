# GLOBAL INGREDIENT INTELLIGENCE v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Spain-first, globally extensible ingredient intelligence subsystem that lets MELO search, explain, substitute and validate ingredients with explicit provenance, confidence and allergen safety.

**Architecture:** Add normalized D’GUSTEAUX-owned tables and authenticated SECURITY INVOKER RPCs in Supabase, keep verified Spanish seed data in versioned source files, and expose the subsystem through small browser modules for RPC access, bounded offline caching and UI rendering. MELO continues to use the existing Safety Gate; ingredient-aware safety evidence is added as a pre-validation layer and every adapted recipe still passes `dgusteaux_validate_recipe` before display.

**Tech Stack:** PostgreSQL/Supabase, PL/pgSQL RPCs, vanilla ES modules, Node `node:test`, single-file static D’GUSTEAUX build packaged as gzip/base64 payload for the isolated Vercel preview.

**Spec:** `docs/superpowers/specs/2026-09-01-global-ingredient-intelligence-v1-design.md`

## Global Constraints

- Initial verified content focuses on ingredients available in Spain; territory model must remain global-ready.
- `LOW` and `UNVERIFIED` data must never be rendered as established fact.
- A substitution can be called safe for a declared allergy/restriction only when evidence for that exact condition is `VERIFIED` or `HIGH`.
- Missing allergen evidence is never treated as evidence of safety.
- Ingredient-intelligence RPC execution: `authenticated=true`, `service_role=true`, `anon=false`, `public=false`.
- Catalogue writes are not exposed to ordinary users.
- No paid AI provider is added.
- No shared Omegalli/CLINICAL Edge Function is repurposed.
- AppDeploy, `main`, KHAMINDRYA and unrelated shared systems remain untouched.
- Knife, heat, oven, hot-oil and similar risky recipe steps retain adult-supervision warnings.
- No E2E success claim is allowed unless the exact culinary acceptance chain is executed.

## File Structure

- Create `dgusteaux-db/migrations/20260901_001_global_ingredient_schema.sql` — normalized schema, constraints, RLS, audit primitives.
- Create `dgusteaux-db/migrations/20260901_002_global_ingredient_rpcs.sql` — authenticated read/analyze RPC contracts and permissions.
- Create `dgusteaux-db/migrations/20260901_003_global_ingredient_seed_es.sql` — deterministic insert/upsert generated from reviewed ES-1 source data.
- Create `dgusteaux-data/es-foundation-v1.json` — canonical ES-1 ingredient records only; no runtime secrets.
- Create `dgusteaux-data/es-foundation-v1.sources.json` — source registry and review metadata.
- Create `dgusteaux-client/ingredient-intelligence.js` — browser RPC adapter and response-shape guards.
- Create `dgusteaux-client/ingredient-intelligence.test.mjs` — adapter tests.
- Create `dgusteaux-client/ingredient-cache.js` — bounded IndexedDB/local cache abstraction with source/confidence preservation.
- Create `dgusteaux-client/ingredient-cache.test.mjs` — cache tests.
- Create `dgusteaux-client/ingredient-ui.js` — search/profile/substitution rendering helpers and interaction state.
- Create `dgusteaux-client/ingredient-ui.test.mjs` — rendering/state tests.
- Modify `dgusteaux-client/melo-intelligence.js` — optional ingredient-intelligence enrichment before server generation/adaptation without breaking local fallback.
- Modify `dgusteaux-client/melo-intelligence.test.mjs` — regression + enrichment tests.
- Create/update isolated static payload under `khamindrya-ionos/payload/ingredient-v1.txt`; update `khamindrya-ionos/index.html` only after payload integrity passes.

---

### Task 1: Normalized Ingredient Schema and Data-Quality Constraints

**Files:**
- Create: `dgusteaux-db/migrations/20260901_001_global_ingredient_schema.sql`

**Interfaces:**
- Consumes: existing `dgusteaux` schema.
- Produces: `ingredients`, `ingredient_aliases`, `ingredient_sensory`, `ingredient_functions`, `ingredient_allergens`, `ingredient_nutrition`, `ingredient_seasonality`, `ingredient_substitutions`, `ingredient_compatibility`, `ingredient_sources`, `ingredient_change_log`.

- [ ] **Step 1: Write RED SQL assertions for missing tables and required constraints**

```sql
select to_regclass('dgusteaux.ingredients') is not null as ingredients_exists;
select to_regclass('dgusteaux.ingredient_sources') is not null as sources_exists;
select to_regclass('dgusteaux.ingredient_substitutions') is not null as substitutions_exists;
```

Expected before migration: all `false`.

- [ ] **Step 2: Apply the schema migration with explicit domains/checks**

The migration must include:

```sql
create table dgusteaux.ingredients (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  scientific_name text,
  category text not null,
  subcategory text,
  default_form text,
  origin_region text,
  active boolean not null default true,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lower(canonical_name), coalesce(default_form,''))
);
```

Use CHECK constraints for: sensory scores `0..5`; confidence in `VERIFIED/HIGH/MEDIUM/LOW/UNVERIFIED`; substitution/compatibility scores `0..100`; season month `1..12`; non-negative nutrition; valid allergen relation `CONTAINS/MAY_CONTAIN/CROSS_CONTACT_RISK/UNKNOWN`; `original_ingredient_id <> substitute_ingredient_id`; canonical compatibility pair ordering `ingredient_a_id < ingredient_b_id`.

`ingredient_change_log` is append-only: revoke client UPDATE/DELETE and store `entity_type`, `entity_id`, `previous_value jsonb`, `new_value jsonb`, `source_id`, `revision`, `changed_at`.

- [ ] **Step 3: Enable RLS and deny direct ordinary-client catalogue writes**

```sql
alter table dgusteaux.ingredients enable row level security;
revoke insert, update, delete on all tables in schema dgusteaux from authenticated, anon;
```

Do not disturb existing grants needed by pre-existing D’GUSTEAUX tables; scope revokes to the new ingredient tables in the actual migration.

- [ ] **Step 4: Run GREEN constraint tests inside a transaction**

Test that negative nutrition, month 13, self-substitution, score 101 and reversed duplicate compatibility fail; valid rows succeed and are rolled back.

- [ ] **Step 5: Commit**

```bash
git add dgusteaux-db/migrations/20260901_001_global_ingredient_schema.sql
git commit -m "feat: add ingredient intelligence schema"
```

---

### Task 2: Authenticated Search and Ingredient Profile RPCs

**Files:**
- Create: `dgusteaux-db/migrations/20260901_002_global_ingredient_rpcs.sql`

**Interfaces:**
- Consumes: Task 1 tables.
- Produces:
  - `public.dgusteaux_search_ingredients(p_query text, p_context jsonb default '{}') returns jsonb`
  - `public.dgusteaux_get_ingredient(p_ingredient_id uuid, p_context jsonb default '{}') returns jsonb`
  - `public.dgusteaux_get_seasonal_ingredients(p_context jsonb default '{}') returns jsonb`

- [ ] **Step 1: RED permission and existence assertions**

```sql
select to_regprocedure('public.dgusteaux_search_ingredients(text,jsonb)') is not null;
select has_function_privilege('anon','public.dgusteaux_search_ingredients(text,jsonb)','EXECUTE');
```

Expected: function absent; anonymous execution not available.

- [ ] **Step 2: Implement normalized search**

Requirements:
- require `auth.uid()`;
- trim and cap query to 120 chars;
- accent-fold with `translate(lower(...),'áéíóúüñ','aeiouun')` consistently for canonical names and aliases;
- return max 20 records;
- return match source (`canonical` or `alias`), language/territory, category and confidence;
- no hidden catalogue write.

- [ ] **Step 3: Implement complete profile RPC**

Return a JSON object with keys exactly:

```json
{
  "ok": true,
  "ingredient": {},
  "aliases": [],
  "sensory": {},
  "functions": [],
  "nutrition": [],
  "allergens": [],
  "seasonality": [],
  "compatibility": [],
  "sources": [],
  "warnings": []
}
```

Do not promote `LOW/UNVERIFIED` nutrition or allergen rows to verified labels; include their confidence explicitly.

- [ ] **Step 4: Implement territory-aware seasonality**

Context accepts `country`, optional `subdivision`, and `month`. Prefer exact subdivision, then country-level fallback. Return `region_not_covered` when no source-backed seasonal record exists.

- [ ] **Step 5: Apply least-privilege grants and run GREEN tests**

```sql
revoke all on function public.dgusteaux_search_ingredients(text,jsonb) from public, anon;
grant execute on function public.dgusteaux_search_ingredients(text,jsonb) to authenticated, service_role;
```

Repeat for all Task 2 RPCs. Verify `authenticated=true`, `anon=false`.

- [ ] **Step 6: Commit**

```bash
git add dgusteaux-db/migrations/20260901_002_global_ingredient_rpcs.sql
git commit -m "feat: add ingredient search and profile RPCs"
```

---

### Task 3: Verified ES-1 Foundation Dataset

**Files:**
- Create: `dgusteaux-data/es-foundation-v1.json`
- Create: `dgusteaux-data/es-foundation-v1.sources.json`
- Create: `dgusteaux-db/migrations/20260901_003_global_ingredient_seed_es.sql`

**Interfaces:**
- Consumes: Task 1 schema.
- Produces: a traceable initial Spain dataset used by Task 2/4 tests and UI.

- [ ] **Step 1: Define a small acceptance seed set before scaling**

Use a deliberately bounded first cohort that exercises the model: `tomate`, `cebolla`, `ajo`, `arroz`, `pollo`, `limón`, `garbanzo`, `leche`, `huevo`, `cacahuete`, `trigo`, `almendra`, `aceite de oliva`, `pimiento`, `manzana`, `naranja`.

- [ ] **Step 2: Record provenance using only reviewed sources**

Use source records for:
- AESAN/BEDCA food-composition data, with original-source attribution preserved.
- AESAN allergen information aligned to Regulation (EU) 1169/2011 Annex II.
- MAPA Spain seasonal fruit/vegetable calendars/guidance for seasonality.

Every data row contains `sourceKey`, `confidence`, `reviewedAt`, and territory. Do not insert a nutrient/allergen/seasonality claim when the source does not substantiate it.

- [ ] **Step 3: RED dataset validation script/check**

Validate before SQL generation:
- all canonical IDs/names unique;
- every scientific/safety/nutrition record references a sourceKey;
- confidence enum valid;
- no allergen safety inference from missing data;
- season months are 1..12.

Use a Node test file if needed during implementation; do not hand-edit generated SQL without rerunning validation.

- [ ] **Step 4: Generate deterministic idempotent seed SQL**

Use stable canonical keys and `insert ... on conflict ... do update` only for explicitly curated catalogue rows. Preserve source/review timestamps from the data manifest.

- [ ] **Step 5: GREEN data tests**

Verify search finds `garbanzo`; milk has explicit `CONTAINS` evidence for milk allergen; peanut has explicit peanut evidence; tomato has at least one source-backed Spain seasonality record; all returned claims include source/confidence.

- [ ] **Step 6: Commit**

```bash
git add dgusteaux-data dgusteaux-db/migrations/20260901_003_global_ingredient_seed_es.sql
git commit -m "feat: seed verified Spain ingredient foundation"
```

---

### Task 4: Safety-Aware Substitution and Recipe Ingredient Analysis

**Files:**
- Modify: `dgusteaux-db/migrations/20260901_002_global_ingredient_rpcs.sql`

**Interfaces:**
- Produces:
  - `public.dgusteaux_suggest_substitutes(p_ingredient_id uuid, p_context jsonb default '{}') returns jsonb`
  - `public.dgusteaux_analyze_ingredients(p_ingredients jsonb, p_context jsonb default '{}') returns jsonb`
- Reuses: `public.dgusteaux_validate_recipe(jsonb,jsonb)` as final recipe gate.

- [ ] **Step 1: RED safety case**

Create a test context declaring a peanut allergy and assert that any candidate with missing/`MEDIUM` peanut-safety evidence is not returned as `safe=true`.

- [ ] **Step 2: Implement substitution eligibility before ranking**

Eligibility order is fixed:
1. resolve declared allergies/restrictions;
2. require `VERIFIED` or `HIGH` evidence for the relevant safety dimension;
3. reject conflicting candidates;
4. only then rank by function/flavor/texture/nutrition/seasonality/availability.

If evidence is insufficient return structured code `insufficient_safety_evidence`; if no eligible candidate remains return `no_safe_substitute`.

- [ ] **Step 3: Implement ingredient analysis**

Input: array of recipe ingredient names/objects plus context. Output keys:

```json
{
  "ok": true,
  "resolved": [],
  "unresolved": [],
  "safetyFindings": [],
  "functions": [],
  "pantrySummary": {"atHome":0,"substitutable":0,"missing":0},
  "warnings": []
}
```

Ambiguous alias matches must be surfaced as `ambiguous_alias`, not silently selected.

- [ ] **Step 4: Extend the Safety Gate bridge conservatively**

Before a recipe adaptation is accepted, use ingredient analysis to detect source-backed allergen conflicts and then call existing `dgusteaux_validate_recipe`. Do not remove existing textual allergen checks or adult-supervision tagging.

- [ ] **Step 5: GREEN tests**

Required cases:
- safe substitution with `HIGH/VERIFIED` evidence passes;
- conflicting allergen candidate rejected;
- missing allergen evidence returns `insufficient_safety_evidence`;
- ambiguous alias is unresolved;
- final adapted recipe still passes existing Safety Gate;
- knife/heat supervision flags remain true.

- [ ] **Step 6: Commit**

```bash
git add dgusteaux-db/migrations/20260901_002_global_ingredient_rpcs.sql
git commit -m "feat: add safe ingredient substitution analysis"
```

---

### Task 5: Browser Ingredient Intelligence Adapter and Offline Cache

**Files:**
- Create: `dgusteaux-client/ingredient-intelligence.js`
- Create: `dgusteaux-client/ingredient-intelligence.test.mjs`
- Create: `dgusteaux-client/ingredient-cache.js`
- Create: `dgusteaux-client/ingredient-cache.test.mjs`

**Interfaces:**
- Produces `searchIngredients`, `getIngredientProfile`, `suggestSubstitutes`, `analyzeIngredients`, `getSeasonalIngredients`.
- Cache API: `getCachedIngredient(id)`, `putCachedIngredient(profile)`, `pruneIngredientCache(maxEntries=50)`.

- [ ] **Step 1: RED adapter tests**

Test: authenticated RPC success; no session returns structured local-unavailable result; RPC error does not fabricate data; malformed response rejected.

- [ ] **Step 2: Implement adapter shape guards**

Every method returns `{ok,data,warnings,reason}` and never converts an RPC uncertainty code into success.

- [ ] **Step 3: RED cache tests**

Test that cached profiles preserve `sources`, `confidence`, `reviewedAt`; max 50 entries; oldest entries evicted; expired/stale data is labeled stale rather than silently current.

- [ ] **Step 4: Implement bounded offline cache**

Use IndexedDB when available; provide an in-memory fallback for test/non-browser environments. Never cache an ingredient profile without its provenance/confidence metadata.

- [ ] **Step 5: GREEN**

```bash
node --test dgusteaux-client/ingredient-intelligence.test.mjs
node --test dgusteaux-client/ingredient-cache.test.mjs
node --check dgusteaux-client/ingredient-intelligence.js
node --check dgusteaux-client/ingredient-cache.js
```

Expected: zero failures and syntax exit 0.

- [ ] **Step 6: Commit**

```bash
git add dgusteaux-client/ingredient-intelligence* dgusteaux-client/ingredient-cache*
git commit -m "feat: add ingredient intelligence browser client"
```

---

### Task 6: Ingredient Search/Profile/Substitution UI and MELO Integration

**Files:**
- Create: `dgusteaux-client/ingredient-ui.js`
- Create: `dgusteaux-client/ingredient-ui.test.mjs`
- Modify: `dgusteaux-client/melo-intelligence.js`
- Modify: `dgusteaux-client/melo-intelligence.test.mjs`

**Interfaces:**
- UI consumes Task 5 adapter only; no direct Supabase table access.
- MELO enrichment consumes `analyzeIngredients` output and passes only structured context into the existing generator.

- [ ] **Step 1: RED UI tests**

Assert rendering contains: ingredient identity, confidence badge, provenance, seasonality, allergen block, substitution dimension scores and explicit uncertainty text.

- [ ] **Step 2: Implement pure rendering/state helpers**

Export pure functions such as:

```js
export function confidenceLabel(level) {}
export function buildIngredientViewModel(profile) {}
export function buildSubstitutionViewModel(result) {}
```

Use established D’GUSTEAUX visual copy: `✓ VERIFICADO`, `ALTA CONFIANZA`, `CONFIANZA MEDIA`, `DATO LIMITADO`.

- [ ] **Step 3: RED MELO enrichment regression**

Existing generation tests must still pass when no ingredient adapter is supplied. Add a test where an adapter supplies resolved canonical context and another where analysis fails; failure must fall back to current behavior rather than block local generation.

- [ ] **Step 4: Implement optional enrichment in `generateWithMelo`**

Add an optional `ingredientIntelligence` dependency. If present and authenticated, analyze requested/pantry ingredients and add only safe structured results to `p_context.ingredientIntelligence`; otherwise preserve current generation behavior exactly.

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

### Task 7: Static Build Integration, Exact Culinary E2E and Release Registration

**Files:**
- Create/update: `khamindrya-ionos/payload/ingredient-v1.txt`
- Modify only after payload verification: `khamindrya-ionos/index.html`
- Update after all gates pass: `dgusteaux.release_registry` through SQL, not a repo file.

**Interfaces:**
- Consumes all previous tasks.
- Produces protected technical preview on `dgusteaux-fallback` only.

- [ ] **Step 1: Integrate UI into the tested single-file D’GUSTEAUX build**

Add entry points from Search, Pantry, Recipe, Substitute and MELO Cockpit. Do not remove existing recipe generation, rating, save, sync or safety behavior.

- [ ] **Step 2: Run browser/static regression checks before packaging**

Check exact required strings/actions exist and extract inline JavaScript for `node --check`. Exercise local mode with no network/auth and verify cached ingredient data retains confidence/source labels.

- [ ] **Step 3: Package atomically**

Gzip the verified HTML, base64 encode it into `ingredient-v1.txt`, reconstruct it locally, and assert reconstructed SHA-256 equals the source HTML SHA-256 before changing the launcher.

- [ ] **Step 4: Switch launcher only after payload integrity passes**

Update `khamindrya-ionos/index.html` from the prior payload to `./payload/ingredient-v1.txt`. Preserve AppDeploy fallback link.

- [ ] **Step 5: Execute the exact culinary E2E acceptance chain**

Using authenticated synthetic test state, execute:

`search ingredient → ingredient profile → provenance → seasonality → allergen detection → safe substitute → substitution explanation → recipe adaptation → dgusteaux_validate_recipe success`

Record each stage result. If any stage is skipped, do not claim E2E success.

- [ ] **Step 6: Run continuity verification**

Verify:
- all ingredient RPCs `authenticated=true`, `anon=false`;
- existing `dgusteaux_generate_recipe`, `dgusteaux_apply_quick_adjustment`, `dgusteaux_validate_recipe`, save/sync/rating regressions remain green;
- Vercel branch deployment is `READY` with no build errors;
- AppDeploy remains `ready`; if `e2e_tests` is null, state that it is null rather than passed;
- shared Omegalli/CLINICAL Edge Functions were not modified by this work;
- `main` remains untouched.

- [ ] **Step 7: Update release registry only after all gates pass**

Set D’GUSTEAUX Supabase source version to `rpc-v1-global-ingredient-intelligence` and Vercel fallback source version to the final isolated branch commit. Notes must include the final payload SHA and E2E result.

- [ ] **Step 8: Commit final static integration**

```bash
git add khamindrya-ionos/index.html khamindrya-ionos/payload/ingredient-v1.txt
git commit -m "feat: activate Global Ingredient Intelligence v1 preview"
```

## Final Verification Checklist

- [ ] Schema constraints reject invalid scientific/safety data.
- [ ] ES-1 seed data has traceable source/confidence metadata.
- [ ] Search/profile/seasonality RPCs work and are auth-only.
- [ ] Substitute ranking never precedes safety eligibility.
- [ ] Missing safety evidence returns `insufficient_safety_evidence`.
- [ ] MELO consumes intelligence without direct table coupling.
- [ ] UI visibly preserves uncertainty/provenance.
- [ ] Offline cache preserves source/confidence and bounded size.
- [ ] Exact culinary E2E chain passes end-to-end.
- [ ] Existing MELO/Cockpit/Safety Gate regressions remain green.
- [ ] No shared Edge Function, `main`, AppDeploy source, KHAMINDRYA or unrelated system is modified.

# MELO Culinary Intelligence v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an RPC-only culinary intelligence pipeline with structured context, deterministic Safety Gate, normalized persistence and automatic local fallback.

**Architecture:** Keep all new server logic in PostgreSQL RPCs under the existing Supabase project. Do not modify any Edge Function used by CLINICAL, Work Search, Secure Gate or Omegalli. The browser calls `dgusteaux_generate_recipe` when authenticated/online and falls back to the current local generator otherwise.

**Tech Stack:** Supabase Postgres/RLS, PL/pgSQL, browser JavaScript, AppDeploy immutable backup.

**Spec:** `docs/superpowers/specs/2026-08-31-melo-culinary-intelligence-v1-design.md`

## Global Constraints
- Do not modify AppDeploy snapshot `1788098154937`.
- Do not modify repository `main`.
- Do not modify `omegalli-app`, `omegalli-api`, Work Search, Secure Gate or CLINICAL Edge Functions.
- Never require or silently purchase a paid model/API.
- Explicit allergies/restrictions and safety rules outrank palate preferences.
- Anonymous users remain local-only.
- Risky knife/heat steps must preserve adult-supervision warnings.

---

### Task 1: Verify existing context and persistence contracts

**Files:** Supabase DB only.

**Interfaces:** `dgusteaux_get_culinary_context()` and `dgusteaux_save_recipe(jsonb,text,jsonb)`.

- [x] Inspect definitions and permissions.
- [x] Verify `authenticated=true`, `anon=false`.
- [x] Verify save is idempotent by stable recipe ID and cleanup leaves zero test rows.

### Task 2: Safety Gate RPC

**Files:**
- Create via migration: `public.dgusteaux_validate_recipe(p_recipe jsonb,p_context jsonb)`.

**Interfaces:** Returns `{ok,recipe,warnings,errors}`.

- [x] Write RED assertion: function does not exist.
- [x] Verify RED failure is missing function.
- [x] Implement structural validation: non-empty title; ingredients/steps arrays; at least one step; servings 1..24.
- [x] Implement explicit allergy/restriction conflict checks using normalized text from ingredient names.
- [x] Reject unsupported dangerous-operation keywords.
- [x] Require complete-cooking guidance for poultry when poultry is present.
- [x] Mark knife/heat steps with `requiresAdultSupervision=true` without hiding original text.
- [x] Grant EXECUTE only to `authenticated` and `service_role`; revoke `anon/public`.
- [x] Run four GREEN cases: allergen conflict rejected; empty steps rejected; unsafe poultry rejected; safe recipe accepted.

### Task 3: Deterministic generation RPC

**Files:**
- Create via migration: `public.dgusteaux_generate_recipe(p_context jsonb)`.

**Interfaces:** Returns `{ok,source:'fallback',recipe,warnings,explanation}`.

- [x] Write RED assertion for missing function.
- [x] Implement canonical context bounds: prompt <=2000 chars, servings 1..12, optional budget/time, arrays for equipment/pantry/allergies/restrictions.
- [x] Merge authenticated cloud context from `dgusteaux_get_culinary_context()` with explicit request values; explicit request restrictions win.
- [x] Implement deterministic recipe families: chicken+rice, sweet/postre, and pantry sauté fallback.
- [x] Apply conservative palate adaptation only to summary/steps/plating metadata; never add ingredients solely for preference and never increase salt.
- [x] Send candidate through `dgusteaux_validate_recipe`; fail closed if not valid.
- [x] Return truthful `source='fallback'` and explanations describing applied signals.
- [x] Grant only authenticated/service_role; revoke anon/public.
- [x] GREEN tests: chicken+rice; low-spice profile; allergy conflict; neutral profile; bounds.

### Task 4: Browser client adapter artifact

**Files:**
- Create on `dgusteaux-fallback`: `dgusteaux-client/melo-intelligence.js` and `dgusteaux-client/melo-intelligence.test.mjs`.

**Interfaces:** `generateWithMelo({supabase,prompt,pantryItems,localGenerate,context})`.

- [x] RED test: missing module/function.
- [x] Implement online/authenticated RPC call to `dgusteaux_generate_recipe`.
- [x] Validate returned shape before accepting it.
- [x] On auth/network/RPC/shape failure call `localGenerate` unchanged.
- [x] Return mode label `MELO Intelligence · servidor` or `MELO · modo local`.
- [x] GREEN tests: RPC success, RPC error fallback, malformed response fallback, no auth fallback and offline fallback.
- [x] Integrate adapter into the static fallback build; pantry regeneration uses the same path and normalized recipe persistence calls `dgusteaux_save_recipe`.
- [x] Package the tested static build into five gzip/base64 payload fragments and verify reconstructed HTML SHA-256 `c1c69731004151e9402e483a9e75d9e58dad15d2c242c9e4ed0408b66208399f`.

### Task 5: Continuity verification

**Files:** `dgusteaux.release_registry` notes/version only after all checks pass.

- [x] Verify Safety Gate four-case suite with fresh SQL evidence.
- [x] Verify generation suite with fresh SQL evidence.
- [x] Verify `dgusteaux_save_recipe` remains idempotent and protected.
- [x] Verify CLINICAL `omegalli-app` remains version 12 ACTIVE with SHA `98b9995bd75d35287374592b648977bb8bcf1033a30f58573003910ea227331a` and `omegalli-api` remains version 11 ACTIVE with SHA `76d37c02a65c72530c664cce58a04baf52659df81591fb157672343adec695e2`; neither was modified by this work.
- [x] Verify AppDeploy remains READY with no frontend/network/backend errors; `e2e_tests` remains null and is not claimed as passed.
- [x] Verify Vercel preview from final commit `e220a85081b471ecda640cbb72fdf2e08c163d86` is READY and its errors-only build log contains no build error.
- [x] Update release registry to `rpc-v1-melo-intelligence` only after all gates are green.

## Verification evidence
- Safety Gate: allergen conflict false; empty steps false; incomplete poultry false; safe poultry true; knife and heat supervision flags true.
- Generation: chicken+rice true/source fallback; low-spice signal active; allergy-to-poultry switches to neutral recipe; neutral signals empty; servings 99 clamps to 12.
- RPC permissions: validate/generate/save `authenticated=true`, `anon=false`.
- Client adapter tests: 5/5 pass; integrated static-build checks: 4/4 pass; inline JavaScript syntax check passes.
- Vercel technical preview is deliberately protected by Vercel Authentication and is not represented as a permanent public URL.

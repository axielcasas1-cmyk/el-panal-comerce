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

- [ ] Write RED assertion: function does not exist.
- [ ] Verify RED failure is missing function.
- [ ] Implement structural validation: non-empty title; ingredients/steps arrays; at least one step; servings 1..24.
- [ ] Implement explicit allergy/restriction conflict checks using normalized text from ingredient names.
- [ ] Reject unsupported dangerous-operation keywords.
- [ ] Require complete-cooking guidance for poultry when poultry is present.
- [ ] Mark knife/heat steps with `requiresAdultSupervision=true` without hiding original text.
- [ ] Grant EXECUTE only to `authenticated` and `service_role`; revoke `anon/public`.
- [ ] Run four GREEN cases: allergen conflict rejected; empty steps rejected; unsafe poultry rejected; safe recipe accepted.

### Task 3: Deterministic generation RPC

**Files:**
- Create via migration: `public.dgusteaux_generate_recipe(p_context jsonb)`.

**Interfaces:** Returns `{ok,source:'fallback',recipe,warnings,explanation}`.

- [ ] Write RED assertion for missing function.
- [ ] Implement canonical context bounds: prompt <=2000 chars, servings 1..12, optional budget/time, arrays for equipment/pantry/allergies/restrictions.
- [ ] Merge authenticated cloud context from `dgusteaux_get_culinary_context()` with explicit request values; explicit request restrictions win.
- [ ] Implement deterministic recipe families: chicken+rice, sweet/postre, and pantry sauté fallback.
- [ ] Apply conservative palate adaptation only to summary/steps/plating metadata; never add ingredients solely for preference and never increase salt.
- [ ] Send candidate through `dgusteaux_validate_recipe`; fail closed if not valid.
- [ ] Return truthful `source='fallback'` and explanations describing applied signals.
- [ ] Grant only authenticated/service_role; revoke anon/public.
- [ ] GREEN tests: chicken+rice; low-spice profile; allergy conflict; neutral profile; bounds.

### Task 4: Browser client adapter artifact

**Files:**
- Create on `dgusteaux-fallback`: `dgusteaux-client/melo-intelligence.js` and `dgusteaux-client/melo-intelligence.test.mjs`.

**Interfaces:** `generateWithMelo({supabase,prompt,pantryItems,localGenerate,context})`.

- [ ] RED test: missing module/function.
- [ ] Implement online/authenticated RPC call to `dgusteaux_generate_recipe`.
- [ ] Validate returned shape before accepting it.
- [ ] On auth/network/RPC/shape failure call `localGenerate` unchanged.
- [ ] Return mode label `MELO Intelligence · servidor` or `MELO · modo local`.
- [ ] GREEN tests: RPC success, RPC error fallback, malformed response fallback, no auth fallback.

### Task 5: Continuity verification

**Files:** `dgusteaux.release_registry` notes/version only after all checks pass.

- [ ] Verify Safety Gate four-case suite with fresh SQL evidence.
- [ ] Verify generation suite with fresh SQL evidence.
- [ ] Verify `dgusteaux_save_recipe` remains idempotent and protected.
- [ ] Verify CLINICAL `omegalli-app` and `omegalli-api` versions/health were not modified by this work.
- [ ] Verify AppDeploy remains READY; do not claim E2E if `e2e_tests` is null.
- [ ] Update release registry to `rpc-v1-melo-intelligence` only after all gates are green.

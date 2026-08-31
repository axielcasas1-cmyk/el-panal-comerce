# MELO Culinary Intelligence v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, provider-ready culinary intelligence pipeline with structured context, deterministic validation, normalized persistence, and automatic fallback.

**Architecture:** Extend the existing Supabase-backed D’GUSTEAUX route rather than create a new project/function slot. Add authenticated context/persistence RPCs, a deterministic server-side validation layer and a `/dgusteaux/api/generate` route. Keep the current browser generator as offline fallback and never require a paid AI provider.

**Tech Stack:** Supabase Postgres/RLS, Supabase Edge Functions (Deno/TypeScript), browser JavaScript, existing AppDeploy build as immutable visual/runtime backup.

**Spec:** `docs/superpowers/specs/2026-08-31-melo-culinary-intelligence-v1-design.md`

## Global Constraints
- Do not modify AppDeploy snapshot `1788098154937`.
- Do not modify repository `main`; work only on `dgusteaux-fallback` for docs/fallback artifacts.
- Do not create a third Supabase project or a new Edge Function slot.
- Never require or silently purchase a paid model/API.
- Explicit allergies/restrictions and safety rules outrank palate preferences.
- Anonymous users remain local-only.
- Existing Omegalli root route must continue to return HTTP 200.

---

### Task 1: Culinary context RPC

**Files:**
- Modify DB via migration: `public.dgusteaux_get_culinary_context()`
- Test: transactional SQL assertions

**Interfaces:**
- Produces: authenticated JSON context `{profile,palate,pantry}`.

- [ ] Write failing SQL assertion showing the RPC does not yet exist/return canonical context.
- [ ] Run assertion and confirm expected failure.
- [ ] Create SECURITY INVOKER RPC using `(select auth.uid())`; grant only `authenticated`; revoke `anon/public`.
- [ ] Run authenticated transaction test; verify own rows only and anonymous denial.
- [ ] Commit migration state through Supabase migration history.

### Task 2: Normalized recipe persistence RPC

**Files:**
- Modify DB via migration: `public.dgusteaux_save_recipe(p_recipe jsonb,p_source text,p_context jsonb)`
- Test: transactional SQL assertions

**Interfaces:**
- Consumes canonical recipe JSON.
- Produces stored row in `dgusteaux.recipes` owned by current user.

- [ ] Write failing test for authenticated save + anonymous denial.
- [ ] Run and confirm failure is missing RPC.
- [ ] Implement minimal SECURITY INVOKER RPC against existing `dgusteaux.recipes` columns after schema inspection.
- [ ] Verify one authenticated write, RLS isolation and rollback cleanup.
- [ ] Verify duplicate client recipe IDs update rather than duplicate when schema supports stable ID.

### Task 3: Server-side Safety Gate

**Files:**
- Modify existing Edge Function `omegalli-app` only.
- Test: local deterministic unit harness + HTTP self-check.

**Interfaces:**
- Produces: `validateRecipe(candidate,context) -> {ok,recipe,warnings}`.

- [ ] Write failing tests for allergen conflict, missing steps, unsafe raw-poultry completion text and safe candidate.
- [ ] Confirm red failures.
- [ ] Implement schema bounds, restriction conflict detection and conservative safety repair/rejection.
- [ ] Run tests green.
- [ ] Ensure validation never adds new ingredients to satisfy palate preferences.

### Task 4: Generate endpoint with truthful fallback

**Files:**
- Modify existing Edge Function `omegalli-app` route `/dgusteaux/api/generate`.
- Test: HTTP self-check through Supabase database HTTP extension.

**Interfaces:**
- Consumes POST canonical context.
- Produces `{ok,source:'provider'|'fallback',recipe,warnings,explanation}`.

- [ ] Write failing HTTP test expecting JSON endpoint.
- [ ] Confirm current route fails/misses endpoint.
- [ ] Implement fallback generator server-side using existing safe recipe patterns and structured context.
- [ ] Add optional provider adapter guarded by secrets/environment only; no provider configured in v1 default.
- [ ] Pass all provider output through Safety Gate; invalid provider output falls back.
- [ ] Verify HTTP 200, JSON content type, `source=fallback` when no provider exists.

### Task 5: Browser integration

**Files:**
- Modify Edge Function asset proxy/overlay so the live Supabase copy calls `/dgusteaux/api/generate` when online.
- Existing AppDeploy source remains untouched.

**Interfaces:**
- Online: server endpoint first.
- Offline/error: existing `generateRecipe` local fallback.

- [ ] Write failing bundle-hook test for online generate path.
- [ ] Patch served JS non-destructively to call server generation, preserve local fallback and apply current palate adaptation only after safety validation.
- [ ] Persist authenticated generated recipes through `dgusteaux_save_recipe`; queue locally on failure.
- [ ] Show truthful UI indicator `MELO Intelligence · servidor` or `MELO · modo local`.
- [ ] Verify pantry/shopping/cook consume the returned recipe object unchanged.

### Task 6: End-to-end verification and continuity

**Files:**
- Update `dgusteaux.release_registry` source version/notes.

- [ ] Run SQL context and persistence tests with rollback.
- [ ] Run Safety Gate unit tests: 0 failures.
- [ ] Self-check `/dgusteaux/`, `/dgusteaux/api/generate`, JS asset and Omegalli root: HTTP 200.
- [ ] Verify AppDeploy `get_app_status`: READY and no new frontend/network errors; do not claim E2E if `e2e_tests` is null.
- [ ] Verify Vercel technical backup record remains untouched/protected.
- [ ] Update release registry to `omegalli-app-v9-melo-intelligence` only after all checks pass.

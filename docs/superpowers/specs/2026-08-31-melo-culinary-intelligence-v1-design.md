# MELO Culinary Intelligence v1 — Design

## Goal
Convert D’GUSTEAUX from a deterministic recipe generator with adaptive post-processing into a provider-ready culinary intelligence pipeline that uses structured context, validates every generated recipe, persists normalized data, and always falls back safely to the local engine.

## Existing baseline
- Supabase project `btdekoigcfpsqteqhcnp`, isolated schema `dgusteaux`.
- Edge route `omegalli-app/dgusteaux`, v8 ACTIVE.
- Tables: `profiles`, `app_state`, `pantry_items`, `recipes`, `palate_profiles`, `dish_feedback`, `release_registry`.
- Existing RPCs: state pull/push and dish rating/profile update.
- AppDeploy snapshot remains immutable backup.
- Vercel preview is technical backup only.

## Architecture
The browser sends a structured culinary context to a new public RPC/Edge API. The server builds a canonical request object containing prompt, servings, budget, time, equipment, pantry, allergies/restrictions, region and palate profile. A provider adapter is optional: if no external model is configured or the provider fails/returns invalid data, the deterministic local engine remains authoritative fallback.

Every candidate recipe passes a deterministic Safety Gate before presentation. The gate rejects or repairs schema errors, unsafe temperature/cooking guidance, explicit allergen conflicts, impossible quantities and unsupported dangerous operations. Safety and user restrictions outrank palate preferences.

The normalized tables become the durable source for authenticated users. `app_state` remains compatibility/fallback storage during migration.

## Interfaces
### `public.dgusteaux_get_culinary_context()`
Authenticated only. Returns user palate profile, pantry rows and profile/preferences available to the culinary engine.

### `public.dgusteaux_save_recipe(p_recipe jsonb, p_source text, p_context jsonb)`
Authenticated only. Validates ownership and stores normalized recipe JSON with source metadata. Anonymous clients remain local-only.

### Edge endpoint `/dgusteaux/api/generate`
POST JSON. Accepts a canonical culinary request. Returns `{ok, source, recipe, warnings, explanation}`. Source is `provider` or `fallback`.

## Provider policy
v1 ships provider-ready but does not require or silently purchase a paid API. Provider configuration is optional and secret-backed. With no provider secret, generation uses deterministic fallback and reports `source=fallback` truthfully.

## Safety invariants
1. Explicit allergies/restrictions are never overridden by palate learning.
2. Palate learning never adds ingredients solely to chase a preference.
3. High umami preference must not increase salt by default.
4. Low spice preference can only reduce heat guidance.
5. Risky knife/heat steps always display adult-supervision warning for minors.
6. Provider output is never trusted before deterministic validation.
7. If validation cannot repair a candidate safely, discard it and use fallback.

## Offline and failure behavior
- No network: local deterministic generator + localStorage/queue.
- Supabase unavailable: local mode continues.
- Provider unavailable/timeout/invalid output: deterministic fallback.
- Auth absent: local-only generation; no normalized cloud write.

## Observability
Generation response exposes truthful source and validation warnings. No hidden claim of AI use when fallback was used.

## Success criteria
- Structured context round-trip works for authenticated users.
- Provider absence produces a valid fallback recipe.
- Invalid provider recipe cannot bypass safety gate.
- Allergies/restrictions win over palate signals.
- Normalized recipe persistence works under RLS.
- Existing AppDeploy backup and Omegalli root stay healthy.

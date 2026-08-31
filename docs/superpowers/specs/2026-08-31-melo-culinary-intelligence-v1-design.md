# MELO Culinary Intelligence v1 — Design

## Goal
Convert D’GUSTEAUX from a deterministic recipe generator with adaptive post-processing into a safe culinary intelligence pipeline that uses structured context, deterministic validation, normalized persistence and an automatic local fallback.

## Current baseline
- Supabase project `btdekoigcfpsqteqhcnp`, isolated schema `dgusteaux`.
- Existing RPCs: `dgusteaux_get_culinary_context()`, `dgusteaux_save_recipe(...)`, state pull/push and dish-rating/profile update.
- AppDeploy snapshot `1788098154937` remains immutable backup.
- `omegalli-app` and `omegalli-api` are now occupied by CLINICAL HOME HEALTH RN and MUST NOT be modified for D’GUSTEAUX.
- Vercel preview remains a technical backup only.

## Architecture
v1 is RPC-only. Authenticated clients call `public.dgusteaux_generate_recipe(p_context jsonb)`. The RPC merges explicit request context with the authenticated user profile, palate and pantry, builds a deterministic candidate recipe, sends that candidate through `public.dgusteaux_validate_recipe(p_recipe jsonb,p_context jsonb)`, and returns `{ok,source:'fallback',recipe,warnings,explanation}`.

The browser uses this RPC when authenticated and online. If authentication, Supabase or network is unavailable, the existing browser generator remains the fallback. No Edge Function slot is required and no paid provider is required. A future provider adapter may be added later behind a dedicated safe service, but v1 never claims provider/AI generation when it used deterministic fallback.

## Safety Gate
`dgusteaux_validate_recipe` enforces these invariants before a recipe may be returned:
1. title, ingredients and steps must exist with bounded shapes;
2. explicit allergies/restrictions outrank palate preferences;
3. the gate never adds ingredients to chase a palate preference;
4. high umami or salty preference never increases salt by default;
5. low spicy preference may only reduce heat guidance;
6. poultry/meat/fish/egg candidates must contain explicit complete-cooking guidance when relevant;
7. dangerous or unsupported operations are rejected;
8. knife/heat steps carry `requiresAdultSupervision=true` so the client keeps the warning visible;
9. if validation cannot repair a candidate conservatively, generation returns the safe deterministic fallback or fails closed.

## Interfaces
### `public.dgusteaux_get_culinary_context()`
Authenticated only. Returns `{profile,palate,pantry}` and never exposes another user’s rows.

### `public.dgusteaux_validate_recipe(p_recipe jsonb,p_context jsonb)`
Authenticated only. Returns `{ok,recipe,warnings,errors}`. It performs deterministic structural, allergen/restriction and cooking-safety validation.

### `public.dgusteaux_generate_recipe(p_context jsonb)`
Authenticated only. Accepts prompt, servings, budget, timeMinutes, equipment, pantry, allergies, restrictions and region. Returns `{ok,source:'fallback',recipe,warnings,explanation}`. `source` is truthful.

### `public.dgusteaux_save_recipe(p_recipe jsonb,p_source text,p_context jsonb)`
Authenticated only. Persists normalized recipe data with ownership enforced by RLS and updates a stable recipe ID rather than duplicating it.

## Failure behavior
- No auth: browser local-only generation.
- No network/Supabase: browser local deterministic generator.
- Invalid RPC result: discard and use browser local generator.
- Explicit allergies/restrictions always override learned palate signals.

## Success criteria
- Context and persistence RPC permissions are verified (`authenticated=true`, `anon=false`).
- Safety Gate rejects allergen conflicts, empty steps and unsafe incomplete poultry guidance, and accepts a safe recipe.
- Generation returns valid JSON with `source='fallback'`, safe structured recipe and explanation.
- Normalized persistence is idempotent for stable recipe IDs.
- Client integration never prevents offline generation.
- AppDeploy and CLINICAL Edge Functions remain untouched and healthy.

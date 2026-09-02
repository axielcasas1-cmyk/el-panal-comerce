# D’GUSTEAUX Premium MELO Rebuild — Design Spec

**Status:** APPROVED — option A “MELO CONDUCTOR PREMIUM”
**Target branch:** `dgusteaux-fallback` only
**Do not merge into:** `main`

## Goal
Convert the currently verified functional D’GUSTEAUX build into the premium culinary application the user approved: MELO must be the visible chef protagonist throughout the complete journey, while the existing recipe engine, Safety Gate, pantry, shopping, ingredient intelligence, ratings, save/sync and palate-learning behavior remain intact.

## Non-negotiable product rules
- MELO is a full-body chef mouse with chef hat, jacket, apron, shoes and metal ladle.
- MELO must be visibly present in every primary stage: Idea, Recipe, Pantry, Shopping, Cooking and Plate/Book.
- No decorative buttons or fake functions.
- Existing functional handlers and RPC contracts are preserved unless a visual integration test proves a change is necessary.
- Ingredient confidence and safety uncertainty must never be visually hidden or upgraded.
- Teen-safe cooking guidance remains visible for knife, heat, oven and other risky steps; no visual redesign may obscure adult-supervision warnings.
- No new external image generation is required. Reuse the already-approved MELO asset.
- No D’GUSTEAUX change may modify KHAMINDRYA production/main behavior.

## Visual direction
### Palette and materials
- Base: obsidian/charcoal black, deep culinary green.
- Metals: brass, copper and warm gold highlights.
- Food-light accents: cream, herb green, ember orange.
- Surfaces: dark stone, warm wood hints, brushed metal, glass and steam/glow effects.
- Avoid generic dashboard aesthetics, empty black panels and flat neon-only styling.

### Typography and hierarchy
- Strong editorial headline scale for the culinary moment.
- Compact technical labels only for provenance, confidence, safety and system state.
- Functional copy remains highly legible; decorative type never replaces labels.

## MELO conductor system
### Desktop/tablet
- Persistent chef stage occupies the left side of the main work area.
- MELO is large enough that full body, shoes and ladle are clearly visible.
- Contextual speech bubble changes with current stage.
- The work panel occupies the right side and retains all existing controls.

### Mobile
- MELO never disappears.
- The persistent stage becomes a compact top chef strip with a cropped but clearly recognizable MELO image plus contextual instruction.
- Full-body MELO remains available in the primary home scene and key cooking/plate moments.

### Stage-specific guidance
- Idea: asks what the user wants and what is available.
- Recipe: explains the generated dish and quick adjustments.
- Pantry: identifies what is at home, missing, optional or substitutable.
- Shopping: focuses on missing items and cost.
- Cooking: becomes the “Chef Station”; shows current step, timers when relevant, safety status and adult-supervision warning where relevant.
- Plate/Book: celebrates completion, rating and learning feedback.

## Home scene
- Replace the visual impression of an empty technical card with a premium chef station.
- MELO is the dominant visual anchor.
- The existing caldron/funnel concept is retained as a subtle functional metaphor, not as the main character.
- Add material depth via gradients, borders, highlights, counter/shelf motifs and restrained steam/fire animation.
- Preserve `speechBubble`, prompt input, quick chips, speech/paste controls, ingredient intelligence access and recipe generation.

## Global MELO guide
- `globalMeloGuide` becomes a premium persistent concierge bar rather than a small utility banner.
- Show MELO portrait/full figure with reliable local asset loading.
- Keep `guideTitle`, `guideBubble`, `guideAction` and stage-updating behavior.

## Ingredient Intelligence presentation
- Keep all data and RPC semantics unchanged.
- Present profile as a chef dossier: identity, origin/provenance, seasonality, sensory profile, allergens, substitutions and confidence.
- Confidence labels remain exact: `✓ VERIFICADO`, `ALTA CONFIANZA`, `CONFIANZA MEDIA`, `DATO LIMITADO`.
- `EVIDENCIA INSUFICIENTE` and unsafe substitute states remain visually prominent.

## Cooking station
- Re-skin the current guided cooking view as a chef station.
- Current step receives strongest hierarchy.
- Timer controls remain functional.
- Adult-supervision requirements must be impossible to miss when the step uses knife/heat/oven or other risky operation.
- Do not add dangerous cooking instructions.

## Book and rating
- Saved recipes become an author-style recipe book rather than an administrative grid.
- Rating keeps sensory learning controls and explicit note that taste is personal.
- MELO remains visible in rating feedback.

## Asset strategy
- The current HTML references an AppDeploy-hosted `melo-fullbody.webp`; this is a fragility point and explains the empty MELO frame observed in the preview.
- Ship the approved MELO asset inside the isolated D’GUSTEAUX branch and reference it with a same-origin relative path.
- All primary MELO instances must use the same-origin asset.
- Existing fallback/rollback remains available, but the premium build must not depend on AppDeploy to render MELO.

## Architecture
- Keep the existing single-file functional application model and its tested inline handlers.
- Apply the premium rebuild as CSS + semantic wrapper enhancement around existing IDs and controls.
- Do not rename IDs used by JavaScript unless accompanied by tests and handler updates.
- Package the resulting HTML to a new premium payload rather than overwriting the previously verified Ingredient Intelligence payload until the new payload passes tests.
- Switch the isolated launcher only after byte-integrity and static regression gates pass.

## Testing and acceptance
A release is accepted only when all of the following are green:
1. Existing Node client/data tests remain green.
2. Inline JavaScript syntax check passes.
3. Static assertions verify MELO same-origin asset references and presence in Home, global guide, Cockpit, Account and Rating.
4. Desktop layout asserts a persistent MELO stage plus functional work panel.
5. Mobile CSS explicitly preserves MELO guide visibility.
6. Existing ingredient search/profile/substitution controls still exist.
7. Existing journey/nav controls remain wired.
8. Existing Safety Gate/E2E backend checks remain green.
9. Premium payload reconstructs byte-for-byte from gzip/base64 packaging.
10. Vercel branch deployment reports READY with no build errors.
11. `main` is not modified.

## Success criterion
When a user opens the D’GUSTEAUX preview, the first impression must be “premium culinary experience led by MELO”, not “technical dashboard”. MELO must be unmistakably present, the culinary materials/lighting must carry the visual identity, and every functional module must remain usable and safety-preserving.
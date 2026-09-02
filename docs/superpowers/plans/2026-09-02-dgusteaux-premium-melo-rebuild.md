# D’GUSTEAUX Premium MELO Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the verified D’GUSTEAUX functional build into the approved premium culinary experience with MELO as the persistent chef protagonist without regressing existing functionality or safety.

**Architecture:** Keep the verified single-file application and existing IDs/handlers. Add a same-origin MELO asset, a premium CSS/semantic overlay, and stage-aware presentation without changing RPC contracts. Package the result into a new isolated premium payload, switch only the `dgusteaux-fallback` launcher after integrity/testing gates pass, then verify the Vercel preview and backend regressions.

**Tech Stack:** HTML/CSS/vanilla JavaScript, Node.js test runner, gzip/base64 payload packaging, GitHub branch deployment to Vercel, Supabase RPC backend.

**Spec:** `docs/superpowers/specs/2026-09-02-dgusteaux-premium-melo-rebuild-design.md`

## Global Constraints
- Target only `dgusteaux-fallback`; never merge or write to `main` during this plan.
- Preserve existing RPC contracts, Safety Gate, pantry, shopping, rating, save/sync, palate learning and Ingredient Intelligence.
- MELO must remain visible in primary stages and use a same-origin asset.
- Do not create fake/decorative buttons.
- Do not hide safety/adult-supervision warnings.
- Do not create new generated images; reuse the approved MELO asset.
- Do not modify KHAMINDRYA production behavior.

---

### Task 1: Same-Origin MELO Asset and Regression Harness

**Files:**
- Create: `khamindrya-ionos/melo-fullbody.png`
- Create locally for validation: `premium-melo-rebuild.test.mjs`
- Source build: verified HTML reconstructed as `/mnt/data/dgusteaux-storage.html`

**Interfaces:**
- Consumes: approved MELO PNG asset SHA-256 `14cab3b0931d44ac600567fed3291c20ad42c2beb74fd3a14678d9573e3e3ad3`.
- Produces: same-origin `./melo-fullbody.png` usable by all MELO surfaces.

- [ ] **Step 1: Write RED static assertions**

Create a Node test that reads the working HTML and asserts:
```js
assert.equal((html.match(/https:\/\/d-gusteaux-2nxkvr\.v2\.appdeploy\.ai\/melo-fullbody\.webp/g)||[]).length,0);
assert.ok((html.match(/\.\/melo-fullbody\.png/g)||[]).length >= 5);
assert.ok(html.includes('premium-chef-shell'));
assert.ok(html.includes('melo-conductor-stage'));
assert.ok(html.includes('chef-material-panel'));
```
Expected before implementation: FAIL.

- [ ] **Step 2: Upload approved MELO asset to the isolated branch**

Create the GitHub blob from the exact local PNG using base64, add it to the branch tree as `khamindrya-ionos/melo-fullbody.png`, and commit without touching any other binary asset.

- [ ] **Step 3: Replace all external MELO image dependencies in working HTML**

Replace every `https://d-gusteaux-2nxkvr.v2.appdeploy.ai/melo-fullbody.webp` and every `./melo-fullbody.webp` with `./melo-fullbody.png`.

- [ ] **Step 4: Re-run static assertions**

Expected: asset-reference assertions PASS while premium layout assertions remain RED until Task 2.

- [ ] **Step 5: Commit asset only**

Commit message: `feat: ship MELO with D’GUSTEAUX preview`.

---

### Task 2: Premium Culinary Shell and Persistent MELO Conductor

**Files:**
- Modify working build: `/mnt/data/dgusteaux-storage.html`
- Test: `/mnt/data/gii-client/premium-melo-rebuild.test.mjs`

**Interfaces:**
- Consumes existing IDs: `globalMeloGuide`, `guideTitle`, `guideBubble`, `guideAction`, `speechBubble`, `prompt`, `generateBtn`, `ingredientIntelHome`, `ingredientIntelPantry`, journey/nav buttons and view IDs.
- Produces premium wrappers/classes only; no existing functional ID may be removed.

- [ ] **Step 1: Add premium design tokens and material system**

Add CSS variables for obsidian, deep herb green, brass/copper, cream, ember, stone and wood; add restrained steam/glow/highlight layers.

- [ ] **Step 2: Upgrade global guide**

Apply class `premium-chef-shell` to the persistent guide; enlarge MELO on desktop/tablet; use a compact always-visible chef strip on mobile. Existing `guideTitle`, `guideBubble`, `guideAction` remain unchanged and functional.

- [ ] **Step 3: Upgrade Home into MELO conductor stage**

Add `melo-conductor-stage` and `chef-material-panel` classes around the existing MELO scene/composer. Increase full-body MELO visual dominance, retain caldron/funnel as secondary metaphor, add premium counter/surface layers with CSS only.

- [ ] **Step 4: Upgrade all functional panels**

Re-skin pantry, shopping, cooking, book, Ingredient Intelligence, cockpit, account and rating panels with the same culinary material system. Do not remove or rename controls.

- [ ] **Step 5: Cooking safety hierarchy**

Ensure `.family-safety`, `.safety-card`, and any `requiresAdultSupervision` rendering receive high-contrast premium warning styling and remain above decorative layers.

- [ ] **Step 6: Mobile MELO preservation**

At `max-width:760px`, keep `globalMeloGuide` visible, prevent MELO portrait collapse, keep primary controls full-width and readable, and preserve bottom nav.

- [ ] **Step 7: GREEN static assertions**

Required assertions:
```text
premium-chef-shell present
melo-conductor-stage present
chef-material-panel present
same-origin MELO refs >= 5
home/pantry/shopping/cook/book view ids unchanged
ingredient dialog unchanged
bottom nav unchanged
adult-supervision copy/classes still present
```

---

### Task 3: Stage-Aware MELO Copy and Chef Station Behavior

**Files:**
- Modify inline JS in `/mnt/data/dgusteaux-storage.html`
- Test: extend `premium-melo-rebuild.test.mjs`

**Interfaces:**
- Consumes existing stage/view functions and DOM IDs.
- Produces stage metadata only; does not alter recipe or Safety Gate payloads.

- [ ] **Step 1: Identify current guide-stage updater**

Locate the function that updates `guideTitle`, `guideBubble`, `meloMood`, and journey active state.

- [ ] **Step 2: Add deterministic stage presentation map**

Map stages to culinary guidance:
```js
home: {title:'¿Qué cocinamos hoy?', bubble:'Cuéntame tu antojo y lo que tienes. Yo conduzco el plato.'}
recipe: {title:'Ya tenemos una dirección.', bubble:'Revisa el plato, sus ingredientes y el Safety Gate antes de afinarlo.'}
pantry: {title:'Abrimos la despensa.', bubble:'Separo lo que tienes, lo que falta y lo que puede sustituirse.'}
shopping: {title:'Compramos solo lo necesario.', bubble:'Aquí ves faltantes y coste antes de salir.'}
cook: {title:'Chef Station activa.', bubble:'Sigue un paso cada vez. Si hay cuchillo o calor, busca supervisión adulta.'}
plate: {title:'Plato terminado.', bubble:'Prueba, valora y dime cómo lo sentiste para aprender de tu paladar.'}
book: {title:'Tu recetario de autor.', bubble:'Aquí guardamos los platos que merecen volver a tu mesa.'}
```

- [ ] **Step 3: Preserve action handlers**

`guideAction` must continue to call existing navigation/action logic. No new nonfunctional action is introduced.

- [ ] **Step 4: Test stage map and safety copy**

Assert `Chef Station activa`, `supervisión adulta`, `Tu recetario de autor` and existing functional handler binding still occur in inline JS.

- [ ] **Step 5: Run Node syntax check**

Extract inline JS and run `node --check` with exit 0.

---

### Task 4: Premium Payload Packaging and Atomic Launcher Switch

**Files:**
- Create: `khamindrya-ionos/payload/premium-v1-part0.txt` … parts as required
- Modify: `khamindrya-ionos/index.html`

**Interfaces:**
- Consumes final verified premium HTML.
- Produces isolated premium preview loader.

- [ ] **Step 1: Compute final source SHA-256**

Record `sha256(source_html)`.

- [ ] **Step 2: Package deterministic gzip/base64**

Use gzip level 9 with `mtime=0`, then base64. Split into parts of at most 10,000 characters for GitHub connector reliability.

- [ ] **Step 3: Reconstruct locally**

Concatenate parts, decode, decompress, verify reconstructed SHA equals source SHA exactly.

- [ ] **Step 4: Upload all premium parts**

Create each `premium-v1-partN.txt` on `dgusteaux-fallback`.

- [ ] **Step 5: Verify each remote blob SHA**

Compare GitHub blob SHA to local Git blob SHA for every part.

- [ ] **Step 6: Atomically update launcher**

Update only `khamindrya-ionos/index.html` to fetch premium payload parts. Keep AppDeploy fallback link for bootstrap failure. Title becomes `D’GUSTEAUX · MELO Premium Culinary Intelligence`.

---

### Task 5: Full Regression, Deployment and Visual Acceptance Gate

**Files:**
- No new feature files unless a failing regression requires a minimal fix.
- Metadata: `dgusteaux.release_registry` only after all gates pass.

**Interfaces:**
- Consumes Tasks 1–4.
- Produces verified premium preview state.

- [ ] **Step 1: Run full Node suite**

Run:
```bash
node --test dgusteaux-data/es-foundation-v1.test.mjs \
  dgusteaux-client/ingredient-intelligence.test.mjs \
  dgusteaux-client/ingredient-cache.test.mjs \
  dgusteaux-client/ingredient-ui.test.mjs \
  dgusteaux-client/melo-intelligence.test.mjs \
  premium-melo-rebuild.test.mjs
```
Expected: zero failures.

- [ ] **Step 2: Run JS syntax checks**

`node --check` all four reusable client modules plus extracted premium inline script. Expected exit 0.

- [ ] **Step 3: Re-run Supabase culinary E2E**

Verify ingredient search → profile → provenance → seasonality → allergen detection → substitute → explanation → adapted recipe → Safety Gate success.

- [ ] **Step 4: Re-run continuity gate**

Verify generator source remains `fallback`, quick adjustment, validation, save, push/pull and rating remain green.

- [ ] **Step 5: Verify Vercel branch deployment**

Require deployment `READY`, build errors empty, branch `dgusteaux-fallback`, and final commit SHA matches the premium launcher switch.

- [ ] **Step 6: Verify isolation**

Confirm `main` has not moved because of this work and the premium changes remain only on `dgusteaux-fallback`.

- [ ] **Step 7: Update release registry**

Set Supabase source version/notes to mention `premium-melo-v1`, final payload SHA, test counts and protected-preview status. Do not change AppDeploy backup row except if metadata truthfulness requires it.

- [ ] **Step 8: Final evidence report**

Report exactly what passed, what URL is available, and any hosting protection still in force. Do not claim public/permanent status unless verified.
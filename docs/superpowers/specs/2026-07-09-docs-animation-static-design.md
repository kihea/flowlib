# Design: Documentation Overhaul, Animation Workflow, Static Diagram Display

Date: 2026-07-09
Status: Approved for implementation (autonomous session; user requested all three workstreams in one brief)

## Goals

1. Replace the API-reference-only documentation with a full documentation set: getting started, concepts, tutorials, guides, and an examples index, plus a product-quality README.
2. Give Flowlib an industry-leading animation workflow, in both the API and the editor workspace.
3. Let the API drive static diagram displays as well as the existing interactive whiteboard canvas.

## Non-goals

- No new renderer work (WebGL2 stays a foundation).
- No breaking changes: every existing export, option, and event keeps working.
- No build tooling, bundler, or docs-site generator; docs stay plain Markdown.

## Workstream 1: Animation core (`src/animation/`)

### Easing catalog (`easing.js`)

Extend `Easings` with the standard families, each as `in/out/inOut`:
`sine`, `quad` (exists), `cubic` (exists), `quart`, `quint`, `expo`, `circ`, `back`, `elastic`, `bounce`. Keep `linear` and `spring`. Add `steps(n)` and `cubicBezierEase(x1, y1, x2, y2)` factory functions. `resolveEase` continues to accept a name or function.

### Timeline (`timeline.js`)

- **Position parameters** anywhere a start time is accepted (`add`, `to`, `fromTo`, `call`, `stagger`): a number, `"+=n"` / `"-=n"` (relative to timeline duration), `"<"` (start of the most recently added tween), `">"` (end of most recently added tween), or a label name.
- **Labels**: `addLabel(name, position?)`, `labelTime(name)`.
- **Callbacks**: `call(fn, position?)` schedules a one-shot callback track (fires when playback crosses its time going forward; re-armed by `reset`).
- **`fromTo(target, fromProps, toProps, options)`**.
- **Repeat control**: `repeat` (count; `Infinity` allowed) and `yoyo` (alternate direction on each repeat). `loop: true` remains an alias for `repeat: Infinity`. Emits a `loop` event per wrap.
- **Playback**: `reverse()`, `progress` getter/setter (0..1), `timeScale(value)` getter/setter over existing `rate`.
- **Stagger**: `stagger(targets, properties, { each, from: "start"|"center"|"end"|index, ...tweenOptions })`.

### Serializable animation clips (new `clip.js`)

The bridge between editor workflow and API:

- `KeyframeTrack { targetId, property, keyframes: [{ time, value, ease }] }` — sorted keyframes, `sample(time)` piecewise interpolation via `interpolateValue`.
- `AnimationClip { name, tracks }` — `setKeyframe(targetId, property, time, value, ease)`, `removeKeyframe`, `clear`, `duration`, `toJSON()` / `AnimationClip.fromJSON(data)`, `buildTimeline(resolveTarget, options)` and `applyTo(timeline, resolveTarget)`.
- `resolveTarget(targetId)` maps ids to live objects (diagram node positions, cameras, scene nodes), so clips survive serialization and can be replayed against a reconstructed scene.

### Presets (`presets.js`)

Add `drawLine(timeline, node, options)` (dash-offset draw-on for line/path nodes) and `cascadeIn(timeline, nodes, options)` (staggered fade-and-rise entrance for lists of nodes or diagram models).

## Workstream 2: Static display (`src/live/`, `src/render/`)

### `DiagramView` (new `src/live/diagram-view.js`)

Lightweight, dependency-free static presenter:

```js
const view = new DiagramView({ canvas, model, layout, fit: true, padding, background, interactive: false });
view.render();
view.toDataURL("image/png");
```

- Accepts `model` (DiagramModel) or `scene` (Scene).
- `interactive: "view"` opt-in enables pan/zoom only (no editing, no dragging).
- `render()`, `fit(padding)`, `setModel`, `toDataURL`, `toBlob`, `destroy()`.
- Re-renders on model `change` events (can be disabled with `watch: false`).
- `renderStaticDiagram(canvas, modelOrOptions)` one-call convenience that returns the view.

### `LiveDiagramEngine` interaction modes

New option `interactions: "edit" | "view" | "none"` (default `"edit"`; `readonly: true` maps to `"view"` for compatibility) plus `setInteractions(mode)`.

- `edit`: current behavior.
- `view`: pan, zoom, hover, click/selection events; node dragging, inline editing, and connection tools disabled.
- `none`: pointer events ignored entirely (static embed with a live timeline still possible).

### Image export (`src/render/image-exporter.js`)

`canvasToBlob(canvas, { type, quality })`, `canvasToDataURL`, `exportCanvasToPNG(canvas, filename)` — used by the workspace PNG button and available to consumers.

## Workstream 3: Editor workspace (`examples/workspace.html`)

Animation panel becomes a real authoring workflow:

- **Transport row**: play, pause, stop (reset to 0), loop toggle, playback speed (0.25x–2x).
- **Keyframe authoring**: per-keyframe easing dropdown; keyframe list rows gain jump-to (click) and delete buttons.
- **Clip save/load**: serialize authored keyframes to an `AnimationClip` JSON download; load a clip JSON back into the workspace.
- **Display mode selector**: Edit / View / Static, wired to `engine.setInteractions` (scene presets fall back gracefully).
- **PNG export** button beside WebM export.

New example page `examples/static-diagram.html`: same model rendered three ways (static, view-only, editable) with code snippets.

## Workstream 4: Documentation

```
README.md                     — product-style overview, quick start, docs map
docs/README.md                — documentation index
docs/getting-started.md       — install, first render, first animation, dev server
docs/concepts.md              — architecture: model / scene / timeline / renderer / engine
docs/tutorials/01-your-first-diagram.md
docs/tutorials/02-animating-a-scene.md
docs/tutorials/03-building-an-interactive-editor.md
docs/tutorials/04-static-diagrams-and-embedding.md
docs/tutorials/05-exporting-video.md
docs/guides/animation.md      — timeline deep dive, easing catalog, clips, stagger, presets
docs/guides/diagrams-and-layouts.md
docs/guides/graphing-and-math-text.md
docs/guides/rendering-and-export.md
docs/examples.md              — annotated map of examples/
docs/API.md                   — updated reference including all new APIs
```

Tutorials are copy-paste runnable against the repo dev server. Guides are task-oriented; API.md stays the exhaustive reference.

## Testing

- `test/animation.test.js` grows coverage for easings, position params, labels, call, repeat/yoyo, reverse, progress, stagger, fromTo.
- New `test/clip.test.js` for KeyframeTrack/AnimationClip incl. JSON round-trip.
- `test/live.test.js` grows coverage for interaction modes and DiagramView (fake canvas/renderer as today).
- Presets additions covered in animation tests.

## Compatibility

All changes are additive. Existing signatures, defaults, events, and examples continue to work unchanged.

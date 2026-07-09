# Animation Guide

Everything about making things move: the timeline, easing, presets, staggering, playback control, and serializable keyframe clips. For a guided introduction, start with [Tutorial 2](../tutorials/02-animating-a-scene.md).

## The model

- A **Tween** interpolates one property path on one target over a duration, through an easing function. Values can be numbers, arrays, colors (hex/rgb strings or `Color`), `Vec2`/`Vec3`, or nested plain objects — `interpolateValue` handles each recursively. Property paths are dotted: `"position.x"`, `"style.stroke"`.
- A **Timeline** schedules tweens (and callbacks) on a shared clock. It is *deterministic*: `seek(t)` produces the same state every time, in any order. That property powers scrubbing, keyframe editing, and frame-exact video export.
- Nothing plays by itself: something must call `timeline.step(dt)` each frame. `LiveDiagramEngine` does this for its own timeline; standalone scenes do it in their render loop.

## Building timelines

```js
const tl = new Timeline();

tl.to(node.position, { x: 100, y: -40 }, { duration: 1, ease: "inOutCubic" });
tl.fromTo(node, { opacity: 0 }, { opacity: 1 }, { duration: 0.5 });   // sets the from-value immediately
tl.call(() => spawnConfetti(), ">");                                   // one-shot callback
```

### Position parameters

Every `at` option (and `add`, `call`, `addLabel`, `stagger`) accepts:

| Value | Meaning |
|---|---|
| `1.5` | absolute seconds |
| `"+=0.5"` / `"-=0.5"` | relative to the current timeline duration |
| `"<"` | start of the most recently added animation |
| `">"` | end of the most recently added animation |
| `"myLabel"` | a label registered with `addLabel(name, position)` |
| omitted | current end of the timeline (append) |

```js
tl.addLabel("reveal", "+=0.25");
tl.to(a, { opacity: 1 }, { duration: 0.4, at: "reveal" });
tl.to(b, { opacity: 1 }, { duration: 0.4, at: "<" });   // with a
tl.to(c, { opacity: 1 }, { duration: 0.4, at: ">" });   // after b
```

### Stagger

```js
tl.stagger(nodes, { opacity: 1 }, {
  duration: 0.4,
  each: 0.1,            // delay between successive targets
  from: "center",       // "start" | "end" | "center" | index number
  ease: "outCubic"
});
```

`properties` may also be a function `(target, index) => props` for per-target values.

### Playback

```js
tl.play();  tl.pause();  tl.stop();          // stop = pause + rewind to 0
tl.seek(1.25);                                // jump; deterministic
tl.progress = 0.5;                            // scrub by fraction
tl.timeScale(2);                              // playback speed (get with no args)
tl.reverse();                                 // flip direction

const looping = new Timeline({ repeat: Infinity, yoyo: true });
// repeat: extra passes (Infinity allowed); yoyo: alternate direction each pass
// loop: true is shorthand for repeat: Infinity
```

Events: `play`, `pause`, `seek`, `loop` (per wrap, with `iteration`), `complete`.

## Easing catalog

Named easings on `Easings` / accepted anywhere `ease` appears:

| Family | Names |
|---|---|
| Linear | `linear` |
| Sine | `inSine`, `outSine`, `inOutSine` |
| Quad | `inQuad`, `outQuad`, `inOutQuad` |
| Cubic | `inCubic`, `outCubic`, `inOutCubic` |
| Quart | `inQuart`, `outQuart`, `inOutQuart` |
| Quint | `inQuint`, `outQuint`, `inOutQuint` |
| Expo | `inExpo`, `outExpo`, `inOutExpo` |
| Circ | `inCirc`, `outCirc`, `inOutCirc` |
| Back | `inBack`, `outBack`, `inOutBack` (overshoot) |
| Elastic | `inElastic`, `outElastic`, `inOutElastic` |
| Bounce | `inBounce`, `outBounce`, `inOutBounce` |
| Physical | `spring` |

Factories for custom curves:

```js
import { steps, cubicBezierEase } from "@flowlib/engine";
tl.to(node, { x: 100 }, { ease: steps(5) });                       // discrete steps
tl.to(node, { x: 100 }, { ease: cubicBezierEase(0.25, 0.1, 0.25, 1) }); // CSS-style curve
tl.to(node, { x: 100 }, { ease: (t) => t * t * (3 - 2 * t) });     // any function
```

Guidance: `inOut*` for repositioning, `out*` for entrances (fast start, gentle settle), `in*` for exits, `outBack`/`outElastic`/`outBounce` for playful emphasis, `spring` for UI-feeling motion.

## Presets

All presets append tweens to a timeline you pass in, so they compose with position parameters.

**Motion and visibility** — `moveTo`, `shift`, `fadeIn`, `fadeOut`, `scaleTo`
**Shape emphasis** — `growToSize`, `growFromCenter`, `rotateTo`, `rotateBy`, `pulse`, `indicate`
**Paths and reveals** — `traceBetween`, `moveAlongPath`, `drawLine` (dash-offset draw-on), `cascadeIn` (staggered entrance for node lists)
**2D camera** — `cameraPanTo`, `cameraZoomTo`, `cameraRotateTo`, `cameraTo`
**3D camera** — `camera3DTo`, `camera3DOrbitTo`, `camera3DOrbitBy`, `camera3DPanBy`, `camera3DDollyTo`, `camera3DDollyBy`

```js
import { cascadeIn, drawLine, cameraTo } from "@flowlib/engine";

cascadeIn(tl, [...model.nodes.values()].map(sceneNodeFor), { each: 0.08 });
drawLine(tl, edgeLine, { duration: 0.7, at: "<" });
cameraTo(tl, scene.camera, { position: { x: 120, y: 0 }, zoom: 1.4, duration: 0.8, at: ">" });
```

## Value trackers and updaters

For Manim-style continuously derived scenes, animate a `ValueTracker` and derive geometry in an updater:

```js
import { ValueTracker } from "@flowlib/engine";

const t = new ValueTracker(0);
tl.to(t, { value: Math.PI * 2 }, { duration: 4, ease: "linear" });

curve.addUpdater(() => {
  curve.setPoints(samplePolar((theta) => 1 + Math.cos(theta * t.value), { samples: 200 }));
});
```

## Animation clips

`AnimationClip` is the serialization layer of the animation workflow: keyframes stored against *target ids* rather than object references.

```js
import { AnimationClip } from "@flowlib/engine";

const clip = new AnimationClip({ name: "intro" });
clip.setKeyframe("node:start", "position", 0, { x: 0, y: 0 });
clip.setKeyframe("node:start", "position", 1, { x: 160, y: 0 }, "outQuart");
clip.setKeyframe("camera2d", "zoom", 0, 1);
clip.setKeyframe("camera2d", "zoom", 1.5, 1.4, "inOutSine");

localStorage.intro = JSON.stringify(clip.toJSON());
```

Replay against live objects through a resolver:

```js
const restored = AnimationClip.fromJSON(JSON.parse(localStorage.intro));
const tl = restored.buildTimeline((targetId) => {
  if (targetId === "camera2d") return scene.camera;
  if (targetId.startsWith("node:")) return model.nodes.get(targetId.slice(5)) || null;
  return null;
});
tl.play();
```

Details:

- `setKeyframe(targetId, property, time, value, ease)` replaces an existing keyframe at the same time; keyframes stay time-sorted.
- The easing stored on a keyframe shapes the segment *arriving at* that keyframe.
- Object values (`{ x, y }`) merge into `Vec2`/`Vec3` targets rather than replacing them.
- `applyTo(timeline, resolve, { offset, tag })` layers a clip onto an existing timeline at an offset; `tag` marks the created tweens (`tween.data.source`) so they can be found and removed later.
- `track.sample(time)` and `clip.sample(time, resolve)` evaluate keyframes without a timeline — useful for thumbnails or custom scrubbing.
- Unresolvable target ids are skipped, so clips degrade gracefully when a scene is missing an object.

### Round-tripping with the workspace

The workspace's Keyframes panel authors exactly this format. **Save clip JSON** downloads a `*.clip.json`; **Load clip JSON** restores it. Target id conventions used by the workspace: `node:<modelNodeId>` (property `position`), `camera2d` (`position`, `zoom`, `rotation`), `camera3d` (`position`, `target`, `zoom`). Author visually, replay programmatically — or generate clips in code and inspect them in the editor.

## Recipes

**Attention ripple across a pipeline**

```js
const order = ["ingest", "clean", "layout", "render"];
order.forEach((id, i) => pulse(tl, model.requireNode(id), { at: i * 0.15, duration: 0.4 }));
```

**Looping demo with a hold at the end**

```js
const tl = new Timeline({ repeat: Infinity });
tl.to(ball.position, { x: 200 }, { duration: 1, ease: "inOutCubic" });
tl.call(() => {}, "+=0.75");   // extends duration => a 0.75s hold before the loop wraps
```

**Scrub UI**

```js
input.addEventListener("input", () => { tl.pause(); tl.progress = input.valueAsNumber; });
```

# Tutorial 2: Animating a Scene

You will choreograph a scene with the timeline: entrances, emphasis, path following, camera moves, and finally a serializable keyframe clip. Time: ~15 minutes.

Start from a scene with a few shapes (or continue from [Tutorial 1](01-your-first-diagram.md) — everything here works on diagram nodes too).

```js
import {
  Canvas2DRenderer, CircleNode, RectNode, Scene, TextNode, Timeline
} from "../src/index.js";

const canvas = document.querySelector("#canvas");
const renderer = new Canvas2DRenderer(canvas);
const scene = new Scene({ background: "#f8fafc" });

const box = new RectNode({ x: -220, width: 130, height: 80, style: { fill: "#ffffff", stroke: "#0f172a" } });
const ball = new CircleNode({ x: 0, radius: 36, style: { fill: "#2563eb" } });
const label = new TextNode({ text: "Flowlib", y: 140, fontSize: 24, style: { fill: "#0f172a" } });
scene.add(box, ball, label);

const timeline = new Timeline();

// the render loop: step the timeline, step the scene, draw
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  timeline.step(dt);
  scene.step(dt);
  renderer.resize();
  renderer.render(scene);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
```

## Step 1 — Tweens and easing

`timeline.to(target, properties, options)` interpolates any property path — numbers, vectors, colors, nested objects:

```js
timeline.to(ball.position, { x: 200 }, { duration: 1, ease: "outBack" });
timeline.to(ball, { opacity: 0.5 }, { duration: 0.5, at: 0.5 });
timeline.play();
```

`ease` accepts any of ~30 named easings (`outBounce`, `inOutQuint`, `outElastic`, `spring`, …), a custom function, or the factories `steps(n)` and `cubicBezierEase(x1, y1, x2, y2)`. The full catalog is in the [Animation guide](../guides/animation.md#easing-catalog).

## Step 2 — Sequencing with position parameters

Every animation call accepts an `at` position. Besides absolute seconds you can use:

| Position | Meaning |
|---|---|
| `"+=0.5"` | half a second after the current end of the timeline |
| `"-=0.2"` | overlap the previous animation by 0.2s |
| `"<"` | at the start of the most recently added animation |
| `">"` | at the end of the most recently added animation |
| `"intro"` | at a named label |

```js
timeline.addLabel("intro", 0);
timeline.to(box.position, { y: -60 }, { duration: 0.6, at: "intro" });
timeline.to(ball.position, { y: -60 }, { duration: 0.6, at: "<" });      // together with the box
timeline.to(label, { opacity: 1 }, { duration: 0.4, at: ">" });          // after they finish
timeline.call(() => console.log("intro done"), ">");                      // scheduled callback
```

## Step 3 — Presets

Presets wrap common motions. They all take `(timeline, target, ...args, options)`:

```js
import { pulse, rotateBy, moveAlongPath, drawLine, cascadeIn } from "../src/index.js";

pulse(timeline, ball, { at: "+=0.2", duration: 0.4, scale: 1.2 });
rotateBy(timeline, box, Math.PI / 2, { duration: 0.6 });
```

Two presets are made for diagrams and reveals:

```js
// staggered entrance for a list of nodes
cascadeIn(timeline, [box, ball, label], { each: 0.12, rise: 24 });

// draw a line/path on, dash-offset style
import { LineNode } from "../src/index.js";
const wire = new LineNode({ points: [{ x: -220, y: 0 }, { x: 0, y: 0 }], style: { stroke: "#0f766e", strokeWidth: 3 } });
scene.add(wire);
drawLine(timeline, wire, { duration: 0.8 });
```

`moveAlongPath` moves a node along sampled points (Bezier curves, function graphs, anything that yields points). Camera presets (`cameraTo`, `camera3DOrbitBy`, …) animate the view itself.

## Step 4 — Stagger and playback control

Animate many targets with one call:

```js
timeline.stagger([box, ball, label], { opacity: 1 }, {
  duration: 0.5,
  each: 0.15,
  from: "center"   // "start" | "end" | "center" | index
});
```

Control playback like a media player:

```js
timeline.timeScale(1.5);   // playback speed
timeline.progress = 0.5;   // scrub to 50%
timeline.reverse();        // flip direction
timeline.stop();           // pause and rewind

// loop forever, bouncing back and forth
const loop = new Timeline({ autoplay: true, repeat: Infinity, yoyo: true });
loop.on("loop", ({ iteration }) => console.log("pass", iteration));
```

## Step 5 — Keyframe clips (save and replay animations)

`AnimationClip` turns keyframes into a JSON document, decoupled from live objects through target ids:

```js
import { AnimationClip } from "../src/index.js";

const clip = new AnimationClip({ name: "intro" });
clip.setKeyframe("ball", "position", 0, { x: -200, y: 0 });
clip.setKeyframe("ball", "position", 1.2, { x: 200, y: -80 }, "outBack");
clip.setKeyframe("ball", "opacity", 0, 0);
clip.setKeyframe("ball", "opacity", 0.5, 1, "linear");

const json = JSON.stringify(clip.toJSON());          // persist anywhere

// later, possibly in another session:
const restored = AnimationClip.fromJSON(JSON.parse(json));
const playback = restored.buildTimeline((id) => (id === "ball" ? ball : null), { autoplay: true });
```

The resolver maps target ids to whatever live objects exist now — scene nodes, diagram nodes, cameras. This is exactly how the workspace's **Save clip JSON / Load clip JSON** buttons work, so clips authored in the editor replay through the API and vice versa.

## Next

[Tutorial 3: Building an Interactive Editor](03-building-an-interactive-editor.md) — wire the live engine's events into your own UI.

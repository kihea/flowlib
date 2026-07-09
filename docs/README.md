# Flowlib Documentation

Flowlib is a dependency-free JavaScript engine for diagrams, mathematical scenes, and Manim-style animation — with a live, embeddable editor and static display modes.

## Start here

- [Getting Started](getting-started.md) — install, render your first diagram, play your first animation.
- [Core Concepts](concepts.md) — how models, scenes, timelines, renderers, and engines fit together.

## Tutorials

Step-by-step, copy-paste runnable against this repo's dev server (`npm run dev`).

1. [Your First Diagram](tutorials/01-your-first-diagram.md) — build a flowchart model, lay it out, render it.
2. [Animating a Scene](tutorials/02-animating-a-scene.md) — timelines, easing, presets, and keyframe clips.
3. [Building an Interactive Editor](tutorials/03-building-an-interactive-editor.md) — the whiteboard canvas: dragging, connecting, inline editing, context menus.
4. [Static Diagrams and Embedding](tutorials/04-static-diagrams-and-embedding.md) — render diagrams as static displays or read-only viewers.
5. [Exporting Video and Images](tutorials/05-exporting-video.md) — deterministic WebM export and PNG snapshots.

## Guides

Task-oriented deep dives.

- [Animation](guides/animation.md) — the full animation workflow: timeline positions, labels, repeat/yoyo, stagger, serializable clips, the easing catalog.
- [Diagrams and Layouts](guides/diagrams-and-layouts.md) — the diagram model, factories, graph builders, and every layout.
- [Graphing and Math Text](guides/graphing-and-math-text.md) — axes, function plots, parametric curves, integration visuals, and the formula renderer.
- [Rendering and Export](guides/rendering-and-export.md) — renderers, pixel ratios, video, and image export.

## Reference

- [API Reference](API.md) — the exhaustive surface, organized by module.
- [Examples](examples.md) — annotated map of every page in `examples/`.

## The workspace

`npm run dev` serves the interactive workspace at `examples/workspace.html` — a full editor with diagram presets, Manim-style scenes, a keyframe animation panel with easing and clip save/load, interaction modes (edit / view / static), and WebM + PNG export.

# Memory glow

Ports Memora's `MemoryEdgeRenderer.swift` image kernel to WebGL: corner displacement,
RGB separation, edge softening, and a continuous transparent feather. The center
retains its original detail. Applied to photo thumbnails in masonry and list views.
Masonry Live Photos and Motion Photos use their current video frame during hover
playback and return to the still image when playback stops. Video frames are
downsampled to at most 1200 pixels on the longest side, uploaded only when playback
time changes, and reuse texture storage when dimensions match. Buffering retains
the last rendered frame. Failed frame uploads restore the normal video element.

Hover for 120 ms to start; enter and exit blend over 300 ms. Rendering is capped at
24 fps, DPR 2, and 1200 pixels on the longest canvas dimension. Only hovered/fading
photos allocate a canvas and GPU resources. Leaving, clicking, resizing,
hiding the document, losing window focus, or unmounting releases resources. No
React state updates occur per frame. Reduced-motion/transparency and touch-only
devices retain the original image.

Textures use the existing thumbnail URL with anonymous CORS. A remote image host
must allow the gallery origin (or `*`) via `Access-Control-Allow-Origin`. Failed
image loading, unavailable WebGL, shader failure, or context loss leaves the normal
image and click interaction intact. Source photos are never modified.

From the repository root:

```sh
pnpm --filter @afilmory/web exec vitest run src/modules/gallery/memory-glow/renderer.test.ts
pnpm --filter @afilmory/web type-check
BUILD_FOR_SERVER_SERVE=1 pnpm --filter @afilmory/web exec vite build
```

The renderer tests cover resolution limits, object-cover cropping, and GPU cleanup
on normal teardown, shader failure, and blocked texture upload. They use a mock GL
context and do not replace browser visual checks. For visual acceptance, compare
portrait/landscape photos, rapid hover changes, scrolling, Live Photo playback,
viewer opening, reduced motion, and a remote host without CORS. A standalone
gallery still needs a generated photo manifest and configured photo storage.

Scrolling keeps the hovered photo animated. Masonry retains pointer events while
scrolling so leaving a photo still fades its glow out; virtualized unmounts release
its resources.

# CSCI336 Lighthouse: Project Guide

You write all the code. This guide tells you **what to build, in what order, what math you need, and how to know it worked.**
Work top to bottom. Don't skip checkpoints. **Screenshot every checkpoint**: those become your report figures.

---

## 0. The target

Your reference: flat-style lighthouse, red and cream stripes, dark cap with a red dot on top, railing, glowing lantern room, dark rocks, water lines, one soft beam.

### Layers (this is also your draw order, back to front)

| #   | Layer                          | Needs                       |
| --- | ------------------------------ | --------------------------- |
| 1   | Sky (gradient)                 | quad, per-vertex color      |
| 2   | Stars                          | small fans, random          |
| 3   | Moon                           | crescent (do last)          |
| 4   | Beams                          | alpha blending              |
| 5   | Sea + water lines              | quads, thin lines           |
| 6   | Island rocks                   | jagged polygon              |
| 7   | Tower body + stripes           | tapered quads               |
| 8   | Door, windows, gallery railing | rects, thin lines           |
| 9   | Lantern room + cap + red dot   | rects, triangle, circle     |
| 10  | Lamp glow                      | radial fade, additive blend |

**Priority:** your professor cares about the lighthouse. Do layers 7-10 and 4 first. Stars and moon are decoration, so they come last.

### Starting layout (clip space, square canvas). Tweak freely.

| Part                       | Value                                             |
| -------------------------- | ------------------------------------------------- |
| Tower x center             | `-0.25` (off-center, beam gets room on the right) |
| Tower bottom / top         | `y = -0.55` / `y = 0.35`                          |
| Half-width at bottom / top | `0.14` / `0.10` (taper)                           |
| Gallery (railing)          | `y = 0.35` to `0.40`                              |
| Lantern room               | `y = 0.40` to `0.55`, half-width `0.07`           |
| Cap                        | `y = 0.55` to `0.62`                              |
| Red dot                    | circle, `r = 0.015` at `y = 0.65`                 |
| Lamp center                | middle of lantern room                            |
| Sea top (horizon)          | `y = -0.55`                                       |
| Island                     | spans `x = -0.7 to 0.2`, peak around `y = -0.5`   |

Put every one of these in a **named constant** at the top of the file (`TOWER_X`, `TOWER_BOTTOM`, ...). Changing the design later = changing one number.

---

## 1. Math toolbox (read once, come back when needed)

### 1.1 Lerp (linear interpolation)

`value = a + (b - a) * t`, where `t` goes 0 → 1.
Example: taper width at the middle of the tower, `a = 0.14`, `b = 0.10`, `t = 0.5` → `0.12`.
**Used for:** tower taper, color gradients, positions along a line.

### 1.2 Color mixing

Lerp each channel. `mix(red, white, 0.5)` = `[1, 0.5, 0.5, 1]`. Same formula, applied to r, g, b, a separately.

### 1.3 Angle → point (circles, stars, arcs)

`x = cx + r * cos(θ)`, `y = cy + r * sin(θ)`. θ is in **radians** (`degrees * π / 180`).
Example: center (0,0), r = 0.5, θ = 90° → (0, 0.5).

### 1.4 Thin line as a quad

WebGL can't draw a line with thickness, so you build a thin rectangle from A to B.

1. direction `d = (B - A)`, length `len = sqrt(dx² + dy²)`, unit `u = d / len`
2. normal (perpendicular) `n = (-u.y, u.x)`
3. 4 corners: `A ± n * (w/2)`, `B ± n * (w/2)`, where `w` is the thickness

Example: A = (0,0), B = (1,0), w = 0.1 → `u = (1,0)`, `n = (0,1)` → corners (0,±0.05) and (1,±0.05).
**Used for:** railing, lantern lattice, water lines, anything thin.

### 1.5 Homogeneous 2D matrices (the transformation core)

Use 3×3 matrices and treat points as `(x, y, 1)`. That's the only way translation fits into a matrix.

```
Translate(tx,ty)   Scale(sx,sy)     Rotate(θ)
| 1 0 tx |         | sx 0  0 |      | cos -sin 0 |
| 0 1 ty |         | 0  sy 0 |      | sin  cos 0 |
| 0 0 1  |         | 0  0  1 |      | 0    0   1 |
```

Example: rotate (1, 0) by 90° → (0, 1).

**Order matters.** `M = A * B` applies **B first**, then A (rightmost first).

**Combined transformations (your rubric gold):**

- Rotate around a point P: `T(P) * R(θ) * T(-P)` (move to origin, rotate, move back)
- Mirror across horizontal line `y = h`: `T(0,h) * S(1,-1) * T(0,-h)`
  Example: point (0.2, h+0.3) → (0.2, h-0.3)
- Mirror across vertical line `x = k`: `T(k,0) * S(-1,1) * T(-k,0)`

**Functions to write:** `identity`, `translate`, `scale`, `rotate`, `multiply(a, b)`, `transformPoint(m, x, y)`.
Store as a flat array of 9 numbers. If you later send one to GLSL with `uniformMatrix3fv`, GLSL reads **column-major**, so decide your layout once and stay consistent.

### 1.6 Seeded random

`Math.random()` gives a different picture on every refresh, which is bad for a report. Write a small seeded generator (search "mulberry32"), so the same seed always gives the same stars and rocks. You can understand and re-type it yourself, and mention it in the report.

### 1.7 Biasing random toward one side

Uniform random `u` in 0..1. Use `u * u` instead: values bunch toward 0.
Stars: `y = top - (top - horizon) * u * u` → dense at the top, sparse near the horizon.

### 1.8 Circle intersection (for the crescent moon, optional)

Circles with radii R1, R2 whose centers are `d` apart on the x-axis:
`x = (d² + R1² - R2²) / (2d)`, `y = ±sqrt(R1² - x²)`

---

## 2. Phase A: Foundation (one sitting)

**Goal:** a clean architecture you won't have to rewrite.

1. **Fix the template bug:** `gl.viewport(0, 0, canvas.clientWidth, canvas.height)` mixes `clientWidth` and `width`. Use `canvas.width` for both.
2. **Canvas:** make it square (e.g. `600 × 600`). A non-square canvas squashes circles because clip space is always -1..1 on both axes. Square avoids the problem for now.
3. **One interleaved buffer:** each vertex = `x, y, r, g, b, a` (6 floats, stride 24 bytes, color offset 8).
4. **Shaders:** `aPosition` (vec2 or vec4) and `aColor` (vec4) in; `vColor` passes to the fragment shader, which outputs it.
5. **Helpers** (these are the whole "representation algorithm" of your scene):
   - `addVertex(x, y, color)`
   - `addTriangle(p1, p2, p3, c1, c2, c3)`: three colors = gradient, same color three times = flat
   - `addQuad(p1, p2, p3, p4, c1, c2, c3, c4)`: 4 corners in order → 2 triangles
   - `addRect(x, y, w, h, color)`
   - `addLine(A, B, thickness, color)`: math 1.4
   - `addFan(cx, cy, r, segments, centerColor, edgeColor)`: circle / glow
6. **Counts are derived**, never typed: `vertexCount = data.length / 6`.
7. **Keep indices out for now.** Hard-edged flat shapes don't share vertices, so there's nothing to save.

**Checkpoint:** a red rectangle and a blue circle on a white background. Console prints `data.length` divisible by 6.

**If broken:** nothing shows → check the console for shader errors. Garbled colors → stride/offset. Missing shapes → `vertexCount`.

---

## 3. Phase B: Transform library

**Goal:** all of section 1.5 working, tested alone.

1. Write the six functions.
2. Keep a **current matrix** that the helpers apply to every point before pushing it. Then `addRect` under a translate+scale just works, and a mirrored copy of anything is `setMatrix(mirror)` + the same drawing function again.
3. Test with the Phase A shapes: draw the circle, then draw it again mirrored across `x = 0`.

**Checkpoint:** a shape and its mirror image, plus one shape rotated around a corner (not the origin). If rotation spins around the wrong point, you forgot the `T(P) * R * T(-P)` sandwich or multiplied in the wrong order.

**Upgrade later (optional, good for the report):** move the matrix to the vertex shader as `uniform mat3 uModel`, and draw each object as its own range with `drawArrays(mode, start, count)`.

---

## 4. Phase C: The lighthouse (the main event)

Build it in this order. Checkpoint after each piece.

### C1. Tower body

- One stripe = a quad with 4 corners: bottom-left, bottom-right, top-right, top-left.
- Half-width at a height: lerp from bottom width to top width with `t = (y - bottom) / (top - bottom)`.
- **Loop** over N bands. Each band uses `t` at its bottom edge and its top edge, so the stripes taper correctly with no hand measuring.
- Alternate red / cream with `i % 2`.
- Reference has 3 red bands. Decide N and band heights as constants.

**Checkpoint:** a tapered striped tower.

### C2. Shading (makes it look designed, not flat)

Reference has a darker left side. Two options:

- **Per-vertex gradient:** left vertices of each stripe darker, right vertices lighter. The GPU blends across the width. This is your interpolation showcase.
- **Two quads per stripe:** a narrow darker strip on the left, flat colors.

Try the gradient first. It's less code.

### C3. Base, door, window slits

- Door: dark rect at the bottom, optional rounded top via a small fan.
- Window slits: small dark rects, one per cream band, placed with a loop.

### C4. Gallery (railing)

- Platform: a dark rect slightly wider than the tower top.
- Railing: a thin top line (`addLine`) + vertical bars in a **loop** with evenly spaced x. Changing the bar count is one number.

### C5. Lantern room

- Cream/warm rect.
- Lattice: crossing diagonal thin lines (`addLine`) in a loop to form diamonds, as in the reference. Use dark thin quads over the warm rect.
- Draw the rect first, lattice on top (draw order).

### C6. Cap and finial

- Dark cap: a trapezoid or triangle above the lantern room.
- Red dot: `addFan` with a small radius.

**Checkpoint:** complete lighthouse, flat colors, no light yet. **This is your minimum-viable submission.** Commit/zip a copy.

---

## 5. Phase D: The light

### D1. Enable blending

Without blending, alpha does nothing.

- Enable `gl.BLEND`
- Normal blend: `gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)`
- Additive (light adds up): `gl.blendFunc(gl.SRC_ALPHA, gl.ONE)`

Normal and additive can't share one draw call, because `blendFunc` is set per draw. So: **draw 1** = everything normal, **draw 2** = glow only, additive. Record the vertex index where the glow starts.

### D2. Beam

- A triangle (or a long quad that widens) from the lamp to far away.
- Lamp-end vertices: warm yellow, alpha ~0.8. Far vertices: same color, **alpha 0**.
- Interpolation gives the fade, so no hard end edge should be visible. If you see one, your far alpha isn't 0, or the beam is clipped by the canvas edge.
- Keep it narrow. Narrow beams look brighter and more believable.
- Start the beam at the **lamp center**, drawn **before** the lantern room so the room covers the origin.

### D3. Second beam by mirroring

Define the beam once. For the other side, apply the vertical-line mirror about `x = TOWER_X` (math 1.5). This is a real combined transformation, and it guarantees both beams match.

### D4. Soft edges (optional)

Stack 2-3 beams of decreasing width and increasing alpha. The center looks brighter, the edges softer.

### D5. Lamp glow

- `addFan` with a bright center and alpha-0 rim, radius ~0.15.
- Stack 2 fans of different sizes and alphas.
- Draw it last, with additive blending.

**Common bugs:**

- Dark halo around the glow → draw order, or a color with alpha 0 that is black. Keep the same RGB at the rim, only alpha changes.
- Beam shows in front of the tower → wrong draw order.
- Everything looks washed out → you left additive on for the normal draw.

**Checkpoint:** lighthouse with glowing lamp and soft beams.

---

## 6. Phase E: Island and sea

### E1. Sea

- A big quad from the horizon down to the bottom, two colors (lighter at the horizon, darker at the bottom) → free gradient.
- Water lines: `addLine` in a loop, short horizontal quads with random x, y, length, and low alpha, from your seeded random.

### E2. Rocks

- **Silhouette:** pick N evenly spaced x values across the island width. For each, `y = base + random * amplitude`. Peak in the middle, lower at the sides (lerp the amplitude down toward the edges).
- **Triangulate:** connect each pair of neighbor points to the flat bottom line with 2 triangles (a strip). That works for any jagged top and avoids concave-polygon problems.
- **Depth:** draw a second, darker, larger rock behind the first. Add a few lighter (pinkish in the reference) small triangles along the lit edge for highlights.
- The tower base must sit **inside** the rock top, not float above it.

**Checkpoint:** lighthouse standing on rocks, water lines around.

---

## 7. Phase F: Sky

### F1. Gradient

One quad: dark navy at the top, slightly lighter near the horizon. Draw it **first**.

### F2. Stars

- Shape: 4-point star = a fan with 8 edge points alternating between outer radius `R` and inner radius `0.35 * R`.
- Per star (seeded random): position (use 1.7 for density), size (mostly tiny, a few big), brightness (alpha), and optionally a random rotation through your matrix functions.
- Spread across the **whole** sky, not a band. Skip positions that land on the lighthouse or moon.
- 100-200 stars is plenty.

### F3. Moon

Pick one:

- **Easy:** a fan circle + a second circle in the sky color offset to cut it. It leaves a visible disc if the sky is a gradient, so use it only if your sky is flat there.
- **Proper:** build the crescent geometry. Two circles (big outer, smaller cutter offset by `d`). Find the two intersection points (math 1.8). Sample N points along the outer arc and N along the cutter's inner arc between the same two intersections, then join matching pairs as a strip of quads.
- Add a soft glow fan behind it, additive.

---

## 8. Phase G: Reflection (optional, strongest transform showcase)

- Mirror the **moon** and the **lamp glow** across the horizon `y = h` with `T(0,h) * S(1,-1) * T(0,-h)`.
- Draw them in the sea region with lower alpha and a darker tint.
- Because your lighthouse stands on rocks, the tower itself doesn't need a reflection. A broken vertical light streak under the lamp (stretched quads with random gaps) is enough.

---

## 9. Submission checklist (don't lose easy marks)

- [ ] Page shows: **assignment number, course details (CSCI336), your name, student ID** (missing info = -1%)
- [ ] Folder named `firstName_lastName` with the `.html` and `.js` only (shaders inline in the html)
- [ ] Check with your lecturer whether `Common/initShaders.js` must be included, since the brief says two files
- [ ] No third-party libraries
- [ ] Cover sheet attached
- [ ] Your model is unique. Confirm your topic with the lecturer early.
- [ ] Late = -20% per day, so aim to finish early

### Report outline

1. Title page + Table of Contents
2. Introduction and concept (why a lighthouse, reference image)
3. Design: layout sketch with labeled parts, color palette
4. CGI model selection: why triangles, why 2D clip space
5. Representation algorithm: how helpers generate vertices (tower taper, circle fans, strips, seeded random)
6. Transformations: matrices, order, the mirror/combined examples with numbers
7. Lighting: blending, gradient interpolation, draw order
8. Implementation: phase screenshots (labeled figures)
9. Challenges and fixes
10. Conclusion, references (cite everything, including the reference image)

**Habit:** after every checkpoint, take a screenshot and write 3 sentences about what you did. The report then writes itself.

---

## 10. Distinction ideas (only after everything above works)

- Fragment-shader glow: distance from the lamp + `smoothstep` for the falloff (self-research the rubric asks for)
- Interactive: keys or mouse move the beam angle (rotation about the lamp)
- Parameter panel: sliders for star count, stripe count, beam width
- Foam and ripples around the rocks, layered clouds with alpha
- Document your own matrix library in the report as a feature

---

## 11. Debug cheat sheet

| Symptom                            | First thing to check                                    |
| ---------------------------------- | ------------------------------------------------------- |
| Black / nothing                    | Console shader errors, attribute names match exactly    |
| Colors garbled                     | Stride / offset, `...color` spread                      |
| Shapes in wrong place              | `vertexCount`, missing vertex in a helper               |
| NaN / vanishing shapes             | A nested array pushed without `...`                     |
| Circle looks like an oval          | Non-square canvas                                       |
| Beam has a hard edge               | Far vertices alpha not 0                                |
| Dark halo around glow              | Rim color RGB is black, or draw order                   |
| Mirror lands in the wrong place    | Missing the translate sandwich, or wrong multiply order |
| Looks different after every reload | Using `Math.random` instead of the seeded one           |

---

## 12. Milestones

1. [ ] Foundation + helpers (Phase A)
2. [ ] Matrices + mirror test (Phase B)
3. [ ] Tower, railing, lantern (Phase C) **→ safe submission point**
4. [ ] Blending, beams, glow (Phase D)
5. [ ] Sea + rocks (Phase E)
6. [ ] Sky, stars, moon (Phase F)
7. [ ] Reflection / extras (Phases G, 10)
8. [ ] Report + checklist (Section 9)

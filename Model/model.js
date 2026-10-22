"use strict";

var gl;

let totalVertices = 0;

let isDay = false;

let starsStart = 0;
let starsEnd = 0;

let beamStart = 0;
let beamEnd = 0;

let moonStart = 0;
let moonEnd = 0;

let glowStart = 0;
let glowEnd = 0;

const FLOATS_PER_VERTEX = 6; // x, y, r, g, b, a
const BYTES = 4;

//convert rgba from 8 int to normalized color
const normalizeColor = (r_, g_, b_, a_) => {
  return [r_ / 255, g_ / 255, b_ / 255, a_];
};

// vertex cordinates with color
const addVertex = (arr, x, y, color) => {
  arr.push(x, y, ...color);
};

// draw triangle
const drawTriangle = (arr, x1, y1, c1, x2, y2, c2, x3, y3, c3) => {
  addVertex(arr, x1, y1, c1);
  addVertex(arr, x2, y2, c2);
  addVertex(arr, x3, y3, c3);
};

// draw quad using 2 triangles
const drawQuad = (arr, p1, c1, p2, c2, p3, c3, p4, c4) => {
  drawTriangle(arr, p1[0], p1[1], c1, p2[0], p2[1], c2, p3[0], p3[1], c3);
  drawTriangle(arr, p1[0], p1[1], c1, p3[0], p3[1], c3, p4[0], p4[1], c4);
};

// draw a rectangle - x, y is the bottom left corner
const drawRect = (arr, x, y, w, h, color) => {
  drawQuad(
    arr,
    [x, y],
    color,
    [x + w, y],
    color,
    [x + w, y + h],
    color,
    [x, y + h],
    color,
  );
};

// Draw a circle using triangle fan geometry
const drawCircle = (arr, cx, cy, radius, color, segments) => {
  for (let i = 0; i < segments; i++) {
    const theta1 = (i / segments) * 2 * Math.PI;
    const theta2 = ((i + 1) / segments) * 2 * Math.PI;

    const x1 = cx + radius * Math.cos(theta1);
    const y1 = cy + radius * Math.sin(theta1);

    const x2 = cx + radius * Math.cos(theta2);
    const y2 = cy + radius * Math.sin(theta2);

    drawTriangle(arr, cx, cy, color, x1, y1, color, x2, y2, color);
  }
};

// Draw a circle with a color fade from the center to the edge
const drawGlow = (arr, cx, cy, radius, centerColor, edgeColor, segments) => {
  for (let i = 0; i < segments; i++) {
    const theta1 = (i / segments) * 2 * Math.PI;
    const theta2 = ((i + 1) / segments) * 2 * Math.PI;

    const x1 = cx + radius * Math.cos(theta1);
    const y1 = cy + radius * Math.sin(theta1);

    const x2 = cx + radius * Math.cos(theta2);
    const y2 = cy + radius * Math.sin(theta2);

    drawTriangle(
      arr,
      cx,
      cy,
      centerColor,
      x1,
      y1,
      edgeColor,
      x2,
      y2,
      edgeColor,
    );
  }
};

function createModelData() {
  const SEGMENTS = 48;

  //default colors
  const RED = [1, 0, 0, 1];
  const WHITE = [1, 1, 1, 1];

  //illustration colors
  const CREAM = normalizeColor(234, 254, 201, 1);
  const TOWER_RED = normalizeColor(218, 34, 26, 1);
  const PURPLE = normalizeColor(48, 25, 52, 1);

  // gradient colors
  const SKY_TOP = normalizeColor(1, 45, 62, 1); // dark at the top
  const SKY_BOTTOM = normalizeColor(8, 110, 122, 1); // lighter near the sea
  const SEA_TOP = normalizeColor(4, 70, 88, 1);
  const SEA_BOTTOM = normalizeColor(1, 38, 52, 1);
  const ISLAND_TOP = normalizeColor(60, 35, 70, 1);
  const ISLAND_BOTTOM = normalizeColor(25, 12, 35, 1);

  // beam: same color at both ends, only alpha changes (needs blending)
  const BEAM_NEAR = normalizeColor(234, 254, 201, 0.6);
  const BEAM_FAR = normalizeColor(234, 254, 201, 0);

  // water lines
  const WATER = normalizeColor(200, 230, 225, 0.8);

  const data = [];

  // the sky - a different color on the top and bottom corners makes the gradient
  drawQuad(
    data,
    [-1, -1],
    SKY_BOTTOM,
    [1, -1],
    SKY_BOTTOM,
    [1, 1],
    SKY_TOP,
    [-1, 1],
    SKY_TOP,
  );

  starsStart = data.length / FLOATS_PER_VERTEX;
  // stars - drawn before the scene so the tower and other objects cover them
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 2 - 1;
    const u = Math.random();
    const y = 0.98 - 1.6 * u * u - -0.35;
    const radius = 0.002 + Math.random() * 0.006;
    const alpha = 0.4 + Math.random() * 0.6;
    const color = normalizeColor(255, 255, 255, alpha);

    drawCircle(data, x, y, radius, color, 8);
  }
  starsEnd = data.length / FLOATS_PER_VERTEX;

  // draw light from lantern - drawn early so the tower and lantern glass cover its start
  beamStart = data.length / FLOATS_PER_VERTEX;
  drawQuad(
    data,
    [0.1, 0.66],
    BEAM_NEAR,
    [1, 0.4],
    BEAM_FAR,
    [1, 0.9],
    BEAM_FAR,
    [-0.1, 0.66],
    BEAM_NEAR,
  );
  beamEnd = data.length / FLOATS_PER_VERTEX;

  // the sea
  drawQuad(
    data,
    [-1, -1],
    SEA_BOTTOM,
    [1, -1],
    SEA_BOTTOM,
    [1, -0.72],
    SEA_TOP,
    [-1, -0.72],
    SEA_TOP,
  );

  // island base
  drawQuad(
    data,
    [-0.55, -0.88],
    ISLAND_BOTTOM,
    [0.55, -0.88],
    ISLAND_BOTTOM,
    [0.38, -0.72],
    ISLAND_TOP,
    [-0.38, -0.72],
    ISLAND_TOP,
  );

  // main tower structure
  drawQuad(
    data,
    [-0.24, -0.72],
    CREAM,
    [0.24, -0.72],
    CREAM,
    [0.132, 0.4],
    CREAM,
    [-0.132, 0.4],
    CREAM,
  );
  // RED bottom PArt
  drawQuad(
    data,
    [-0.21, -0.4],
    TOWER_RED,
    [0.21, -0.4],
    TOWER_RED,
    [0.18, -0.1],
    TOWER_RED,
    [-0.18, -0.1],
    TOWER_RED,
  );
  // RED top PArt
  drawQuad(
    data,
    [-0.156, 0.15],
    TOWER_RED,
    [0.156, 0.15],
    TOWER_RED,
    [0.132, 0.4],
    TOWER_RED,
    [-0.132, 0.4],
    TOWER_RED,
  );

  // door
  drawRect(data, -0.06, -0.72, 0.12, 0.16, PURPLE);
  // windows - one in the middle of each upper band
  drawRect(data, -0.027, -0.285, 0.054, 0.07, PURPLE); // lower red band
  drawRect(data, -0.027, -0.01, 0.054, 0.07, PURPLE); // cream band
  drawRect(data, -0.027, 0.24, 0.054, 0.07, PURPLE); // upper red band

  // gallery part
  drawQuad(
    data,
    [-0.156, 0.43],
    PURPLE,
    [0.156, 0.43],
    PURPLE,
    [0.132, 0.4],
    PURPLE,
    [-0.132, 0.4],
    PURPLE,
  );
  // neck part
  drawQuad(
    data,
    [-0.132, 0.4],
    PURPLE,
    [0.132, 0.4],
    PURPLE,
    [0.12, 0.6],
    PURPLE,
    [-0.12, 0.6],
    PURPLE,
  );
  // top semi circle
  var topCX = 0;
  var topCY = 0.75;
  var topR = 0.1;
  drawCircle(data, topCX, topCY, topR, RED, SEGMENTS);
  // lantern glass
  drawQuad(
    data,
    [-0.118, 0.6],
    CREAM,
    [0.118, 0.6],
    CREAM,
    [0.1, 0.75],
    CREAM,
    [-0.1, 0.75],
    CREAM,
  );
  moonStart = data.length / FLOATS_PER_VERTEX;
  // draw the moon
  var MoonCX = -0.55;
  var MoonCY = 0.82;
  var MoonR = 0.05;
  drawGlow(
    data,
    MoonCX,
    MoonCY,
    MoonR + 0.12,
    normalizeColor(255, 240, 170, 0.4),
    normalizeColor(255, 240, 170, 0),
    SEGMENTS,
  );
  drawCircle(data, MoonCX, MoonCY, MoonR, WHITE, SEGMENTS);
  moonEnd = data.length / FLOATS_PER_VERTEX;

  // water lines - thin rects in the sea around the island (x, y, width, height)
  drawRect(data, -0.95, -0.78, 0.3, 0.006, WATER);
  drawRect(data, 0.65, -0.8, 0.3, 0.006, WATER);
  drawRect(data, -0.9, -0.85, 0.35, 0.006, WATER);
  drawRect(data, 0.6, -0.87, 0.25, 0.006, WATER);
  drawRect(data, -0.5, -0.92, 0.45, 0.006, WATER);
  drawRect(data, 0.1, -0.95, 0.4, 0.006, WATER);
  drawRect(data, -0.8, -0.97, 0.25, 0.006, WATER);

  glowStart = data.length / FLOATS_PER_VERTEX;
  drawGlow(
    data,
    0,
    0.675,
    0.25,
    normalizeColor(255, 240, 170, 0.4),
    normalizeColor(255, 240, 170, 0),
    SEGMENTS,
  );
  glowEnd = data.length / FLOATS_PER_VERTEX;

  return data;
}

function setupWebGL(canvas, points) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(...normalizeColor(1, 80, 93, 1));

  // blending makes the alpha values work (beam fade, water lines)
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  const bufferId = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

  const stride = FLOATS_PER_VERTEX * BYTES;

  const aPosition = gl.getAttribLocation(program, "aPosition");
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(aPosition);

  const aColor = gl.getAttribLocation(program, "aColor");
  gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, stride, 2 * BYTES);
  gl.enableVertexAttribArray(aColor);

  render(points.length / FLOATS_PER_VERTEX);
}

window.onload = function init() {
  const canvas = document.getElementById("gl-canvas");
  // alpha: false keeps the canvas opaque so blending doesn't show the page behind it
  gl = canvas.getContext("webgl2", { alpha: false });

  if (!gl) {
    alert("WebGL 2.0 isnt available");
    return;
  }

  const data = createModelData();
  const points = new Float32Array(data);
  totalVertices = points.length / FLOATS_PER_VERTEX;
  console.log(points.length);
  setupWebGL(canvas, points);
};

function render(vertices) {
  if (isDay) {
    // Daytime blue background.
    gl.clearColor(...normalizeColor(225, 241, 253, 1));
  } else {
    // Nighttime background.
    gl.clearColor(...normalizeColor(1, 80, 93, 1));
  }

  gl.clear(gl.COLOR_BUFFER_BIT);

  if (isDay) {
    // Do not draw the night sky, so the clear color becomes the background.
    // Skip stars.
    // Draw from after the stars through before the beam.
    gl.drawArrays(gl.TRIANGLES, starsEnd, beamStart - starsEnd);

    // Skip the beam.
    // Draw from after the beam through before the moon.
    gl.drawArrays(gl.TRIANGLES, beamEnd, moonStart - beamEnd);

    // Skip the moon.
    // Draw from after the moon through before the glow.
    gl.drawArrays(gl.TRIANGLES, moonEnd, glowStart - moonEnd);

    // Skip the lighthouse glow.
    gl.drawArrays(gl.TRIANGLES, glowEnd, vertices - glowEnd);
  } else {
    // Draw everything normally at night.
    gl.drawArrays(gl.TRIANGLES, 0, vertices);
  }
}

window.addEventListener("keydown", function (event) {
  if (event.key.toLowerCase() === "d") {
    isDay = true;
  }

  if (event.key.toLowerCase() === "n") {
    isDay = false;
  }

  render(totalVertices);
});

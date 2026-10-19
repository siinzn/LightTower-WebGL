"use strict";

var gl;

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

function createModelData() {
  const SEGMENTS = 48;

  //default colors
  const RED = [1, 0, 0, 1];
  const GREEN = [0, 1, 0, 1];
  const BLUE = [0, 0, 1, 1];
  const WHITE = [1, 1, 1, 1];

  //illustration colors
  const CREAM = normalizeColor(234, 254, 201, 1);
  const TOWER_RED = normalizeColor(218, 34, 26, 1);
  const BROWN = normalizeColor(101, 67, 33, 1);
  const PURPLE = normalizeColor(48, 25, 52, 1);
  const TEAL = normalizeColor(1, 80, 93, 0.9);

  const data = [];

  // the land
  drawQuad(
    data,
    [-1, -1],
    BROWN,
    [1, -1],
    BROWN,
    [1, -0.72],
    BROWN,
    [-1, -0.72],
    BROWN,
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
  // draw light from lantern - light is overlapped by the lantern glass to look more seamless
  drawQuad(
    data,
    [0.1, 0.66],
    CREAM,
    [1, 0.4],
    TEAL,
    [1, 0.9],
    TEAL,
    [-0.1, 0.66],
    CREAM,
  );
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
  // draw the moon
  var MoonCX = -0.45;
  var MoonCY = 0.85;
  var MoonR = 0.05;
  drawCircle(data, MoonCX, MoonCY, MoonR, WHITE, SEGMENTS);

  // draw water lines - lines are just small heighted quads
  drawQuad(
    data,
    [-0.7, -0.5],
    WHITE,
    [-0.3, -0.5],
    WHITE,
    [-0.3, -0.495],
    WHITE,
    [-0.7, -0.495],
    WHITE,
  );
  drawQuad(
    data,
    [-0.4, -0.3],
    WHITE,
    [-0.2, -0.3],
    WHITE,
    [-0.2, -0.295],
    WHITE,
    [-0.4, -0.295],
    WHITE,
  );
  drawQuad(
    data,
    [0.8, -0.1],
    WHITE,
    [0.4, -0.1],
    WHITE,
    [0.4, -0.095],
    WHITE,
    [0.8, -0.095],
    WHITE,
  );
  drawQuad(
    data,
    [0.6, -0.4],
    WHITE,
    [0.3, -0.4],
    WHITE,
    [0.3, -0.395],
    WHITE,
    [0.6, -0.395],
    WHITE,
  );

  return data;
}

function setupWebGL(canvas, points) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(...normalizeColor(1, 80, 93, 1));

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
  gl = canvas.getContext("webgl2");

  if (!gl) {
    alert("WebGL 2.0 isnt available");
    return;
  }

  const data = createModelData();
  const points = new Float32Array(data);
  console.log(points.length);
  setupWebGL(canvas, points);
};

function render(vertices) {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, vertices);
}

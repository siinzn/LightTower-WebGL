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
  const RED = [1, 0, 0, 1];
  const GREEN = [0, 1, 0, 1];
  const BLUE = [0, 0, 1, 1];
  const WHITE = [1, 1, 1, 1];

  const data = [];

  drawTriangle(data, -0.5, -1, WHITE, 0.5, -1, WHITE, 0, -0.5, WHITE);

  drawQuad(
    data,
    [-0.5, -0.5],
    BLUE,
    [0.5, -0.5],
    BLUE,
    [0.5, 0.5],
    BLUE,
    [-0.5, 0.5],
    WHITE,
  );

  var numCircleSegments = 48;
  var cx = -0.75;
  var cy = 0.75;
  var r = 0.2;
  drawCircle(data, cx, cy, r, RED, numCircleSegments);

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

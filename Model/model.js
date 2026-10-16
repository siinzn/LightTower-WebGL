"use strict";

var gl;
var points = [];

const drawMoon = () => {};
const drawTriangle = () => {};

window.onload = function init() {
  var canvas = document.getElementById("gl-canvas");
  gl = canvas.getContext("webgl2");

  if (!gl) alert("WebGL 2.0 isnt available");

  points = new Float32Array([-0.5, 0, 0.5, 0, 0, 0.6]);

  gl.viewport(0, 0, canvas.clientWidth, canvas.height);
  gl.clearColor(1, 1, 1, 1);

  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  var bufferId = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

  var aPosition = gl.getAttribLocation(program, "aPosition");
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  render(points.length / 2);
};

function render(vertices) {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, vertices);
}

// GLSL ES 3.00 sources for the WebGL2 engine.
//
// Both engines color pixels with the same COLORIZE_GLSL function, so pictures look the
// same whichever engine drew them (contracts/render-engine.md). The iteration in
// GPU_FRAGMENT must match smoothIterations() in js/fractal.js exactly.

import { ESCAPE_RADIUS } from "../fractal.js";

const R2 = (ESCAPE_RADIUS * ESCAPE_RADIUS).toFixed(1);

/** Full-screen triangle; needs no vertex buffers. */
export const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** Shared coloring: smooth iteration value → color. */
const COLORIZE_GLSL = `
uniform sampler2D u_palette;  // 1024×1 RGBA, linear filtering, repeat
uniform float u_shift;        // [0, 1)
uniform float u_density;      // palette repeats per 100 iterations
uniform bool u_smooth;
uniform vec3 u_inside;

vec4 colorize(float nu) {
  if (nu < 0.0) return vec4(u_inside, 1.0);
  float v = u_smooth ? nu : floor(nu);
  float t = fract(v * u_density / 100.0 + u_shift);
  return vec4(texture(u_palette, vec2(t, 0.5)).rgb, 1.0);
}
`;

/** GPU engine: iterates every pixel on the graphics card. */
export const GPU_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 u_center;   // view center
uniform float u_scale;   // complex size of one rendered pixel
uniform vec2 u_size;     // rendered size in pixels
uniform int u_type;      // 0 = Mandelbrot, 1 = Julia
uniform vec2 u_julia;
uniform int u_maxIter;
${COLORIZE_GLSL}
out vec4 outColor;

void main() {
  vec2 p = u_center + (gl_FragCoord.xy - 0.5 * u_size) * u_scale;
  vec2 z = u_type == 1 ? p : vec2(0.0);
  vec2 c = u_type == 1 ? u_julia : p;
  float nu = -1.0;
  for (int n = 0; n < u_maxIter; n++) {
    float x2 = z.x * z.x;
    float y2 = z.y * z.y;
    if (x2 + y2 > ${R2}) {
      nu = max(0.0, float(n) + 1.0 - log2(0.5 * log(x2 + y2)));
      break;
    }
    z = vec2(x2 - y2 + c.x, 2.0 * z.x * z.y + c.y);
  }
  outColor = colorize(nu);
}`;

/** CPU engine: colors a texture of smooth values computed by the workers. */
export const NU_FRAGMENT = `#version 300 es
precision highp float;

uniform sampler2D u_nu;  // R32F, one value per grid cell, row 0 = top
uniform vec2 u_size;     // target size in pixels
uniform vec2 u_cover;    // pixels covered by the grid (grid size × step)
${COLORIZE_GLSL}
out vec4 outColor;

void main() {
  vec2 uv = vec2(gl_FragCoord.x, u_size.y - gl_FragCoord.y) / u_cover;
  outColor = colorize(texture(u_nu, uv).r);
}`;

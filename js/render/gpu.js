// WebGL2 engine: draws fractals on the graphics card, and colors the CPU engine's results.

import { VERTEX, GPU_FRAGMENT, NU_FRAGMENT } from "./shaders.js";
import { buildColorTable, hexToRgb, TABLE_SIZE } from "../palette.js";
import { pixelScale } from "../view.js";

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    throw new Error(`Shader error: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function createProgram(gl, fragmentSource) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error(`Shader link error: ${gl.getProgramInfoLog(program)}`);
  }
  const locations = new Map();
  return {
    program,
    loc(name) {
      if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
      return locations.get(name);
    },
  };
}

export class GpuEngine {
  constructor(canvas, onRestored = () => {}) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2", {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: "high-performance",
    });
    if (!this.gl) throw new Error("WebGL2 is not available");
    canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
    canvas.addEventListener("webglcontextrestored", () => {
      this.#init();
      onRestored();
    });
    this.#init();
  }

  #init() {
    const gl = this.gl;
    this.fractal = createProgram(gl, GPU_FRAGMENT);
    this.nu = createProgram(gl, NU_FRAGMENT);
    this.vao = gl.createVertexArray();

    this.paletteTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.paletteKey = null;

    this.nuTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.nuTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.nuData = null;

    this.fbo = null;
    this.fboTex = null;
    this.fboSize = [0, 0];
  }

  /** Uploads a palette (only when it changed). */
  setPalette(stops) {
    const key = stops.join(",");
    if (key === this.paletteKey) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TABLE_SIZE, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      buildColorTable(stops));
    this.paletteKey = key;
  }

  /** Stores the color setting used by the next draw. */
  setColor(color) {
    this.color = color;
  }

  #applyColor(prog) {
    const gl = this.gl;
    const c = this.color;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex);
    gl.uniform1i(prog.loc("u_palette"), 0);
    gl.uniform1f(prog.loc("u_shift"), c.shift);
    gl.uniform1f(prog.loc("u_density"), c.density);
    gl.uniform1i(prog.loc("u_smooth"), c.smooth ? 1 : 0);
    gl.uniform3fv(prog.loc("u_inside"), hexToRgb(c.inside).map((v) => v / 255));
  }

  #ensureFbo(w, h) {
    const gl = this.gl;
    if (this.fbo && this.fboSize[0] === w && this.fboSize[1] === h) return;
    if (!this.fbo) {
      this.fbo = gl.createFramebuffer();
      this.fboTex = gl.createTexture();
    }
    // Texture unit 2 is used by no shader: binding the render target on unit 0 or 1 would
    // replace the palette or the CPU values and form a feedback loop (read and write the same texture).
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTex, 0);
    this.fboSize = [w, h];
  }

  /** Binds the screen, or an offscreen buffer when drawing smaller or for reading back. */
  #begin(w, h, offscreen) {
    const gl = this.gl;
    if (offscreen) {
      this.#ensureFbo(w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.viewport(0, 0, w, h);
    gl.bindVertexArray(this.vao);
  }

  /** Scales the offscreen buffer up onto the whole canvas. */
  #present(w, h, W, H) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Draws a fractal setting at W×H. `scale` < 1 renders fewer pixels and scales them up
   * (used during gestures). `offscreen` draws into a buffer for readPixels().
   */
  drawFractal(setting, W, H, { maxIter, scale = 1, offscreen = false }) {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    const w = Math.max(1, Math.round(W * scale));
    const h = Math.max(1, Math.round(H * scale));
    const reduced = w !== W || h !== H;
    this.#begin(w, h, offscreen || reduced);

    const prog = this.fractal;
    gl.useProgram(prog.program);
    gl.uniform2f(prog.loc("u_center"), setting.view.cx, setting.view.cy);
    gl.uniform1f(prog.loc("u_scale"), pixelScale(setting.view, W, H) * (W / w));
    gl.uniform2f(prog.loc("u_size"), w, h);
    gl.uniform1i(prog.loc("u_type"), setting.type === "julia" ? 1 : 0);
    gl.uniform2f(prog.loc("u_julia"), setting.julia.re, setting.julia.im);
    gl.uniform1i(prog.loc("u_maxIter"), maxIter);
    this.#applyColor(prog);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (reduced && !offscreen) this.#present(w, h, W, H);
  }

  /**
   * Colors a grid of smooth values from the CPU engine and draws it at W×H.
   * Each grid cell covers step×step pixels (step > 1 for the quick preview).
   */
  drawNu(nu, gw, gh, step, W, H, { offscreen = false } = {}) {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    this.#begin(W, H, offscreen); // first: setting up the offscreen buffer changes texture bindings
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.nuTex);
    if (this.nuData !== nu) {
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, gw, gh, 0, gl.RED, gl.FLOAT, nu);
      this.nuData = nu;
    }

    const prog = this.nu;
    gl.useProgram(prog.program);
    gl.uniform1i(prog.loc("u_nu"), 1);
    gl.uniform2f(prog.loc("u_size"), W, H);
    gl.uniform2f(prog.loc("u_cover"), gw * step, gh * step);
    this.#applyColor(prog);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Reads the offscreen buffer (rows bottom-up, RGBA). */
  readPixels(w, h) {
    const gl = this.gl;
    const out = new Uint8Array(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return out;
  }
}

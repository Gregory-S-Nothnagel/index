// webgl.js

export function createProgram(gl, vsSource, fsSource) {
  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh));
    }
    return sh;
  };

  const vert = compile(gl.VERTEX_SHADER, vsSource);
  const frag = compile(gl.FRAGMENT_SHADER, fsSource);
  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog));
  }
  return prog;
}

export function setupFullscreenQuad(gl, program) {
  const data = new Float32Array([
    -1,  1,  0, 1,
    -1, -1,  0, 0,
     1, -1,  1, 0,
    -1,  1,  0, 1,
     1, -1,  1, 0,
     1,  1,  1, 1
  ]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, 'aPos');
  const aUV  = gl.getAttribLocation(program, 'aUV');
  gl.enableVertexAttribArray(aPos);
  gl.enableVertexAttribArray(aUV);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
  gl.vertexAttribPointer(aUV,  2, gl.FLOAT, false, 16, 8);
}

export function setupVideoTexture(gl, width, height) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // allocate storage
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA,
    width, height, 0,
    gl.RGBA, gl.UNSIGNED_BYTE,
    null
  );
  return tex;
}


/**
 * Reads the `uAspect` uniform from the given program and
 * keeps it updated to canvas.clientHeight / canvas.clientWidth
 * (and updates gl.viewport for you).
 *
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram}         program
 * @param {HTMLCanvasElement}    canvas
 */
export function setupFOV(gl, program, canvas) {
  const loc = gl.getUniformLocation(program, 'uAspect');
  if (loc === null) {
    console.warn('uAspect not found in shader; skipping setupFOV.');
    return;
  }

  function update() {
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    const aspect = canvas.clientHeight / canvas.clientWidth;
    gl.useProgram(program);
    gl.uniform1f(loc, aspect);
  }

  update();
  window.addEventListener('resize', update);
}
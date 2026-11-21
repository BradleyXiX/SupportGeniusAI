// Native WebGL point geometry for Signal Core.
// Single owner for camera rotation and canvas drawing.
// Preserves DPR <= 1.5, cancels RAF when hidden/offscreen, cleans up on dispose.

export function mountCore(canvas, poster, { onDispose = () => {} } = {}) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    powerPreference: 'low-power'
  });
  if (!gl) throw new Error('WebGL unavailable');

  const shaders = [];
  let program;
  let buffer;
  let raf = 0;
  let disposed = false;
  let visible = true;
  let angle = 0;
  let last = 0;
  let totalTime = 0;
  let uTime;
  let uRotation;
  let uAspect;
  let schedule = () => {};
  let observer;
  let resize;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Shader compilation failed');
    }
    return shader;
  };

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    observer?.disconnect();
    resize?.disconnect();
    document.removeEventListener('visibilitychange', schedule);
    canvas.removeEventListener('webglcontextlost', contextLost);

    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));

    canvas.hidden = true;
    if (poster) {
      poster.style.visibility = 'visible';
    }
    onDispose();
  }

  function contextLost(event) {
    event.preventDefault();
    dispose();
  }

  try {
    const vertexSource = [
      'attribute vec3 p;',
      'attribute float t;',
      'attribute float s;',
      'uniform float u_time;',
      'uniform float u_rotation;',
      'uniform float u_aspect;',
      'varying float v_type;',
      'varying float v_depth;',
      'varying float v_seed;',
      'void main() {',
      '  vec3 pos = p;',
      '  if (t < 0.5) {',
      '    float disp = sin(pos.x * 3.5 + u_time * 0.75) * cos(pos.y * 3.2 + u_time * 0.60) * 0.08',
      '               + sin(pos.z * 4.0 - u_time * 0.85) * 0.06',
      '               + sin(pos.x * pos.z * 5.0 + u_time * 1.10) * 0.04;',
      '    pos *= (1.0 + disp);',
      '  } else {',
      '    vec3 drift = vec3(',
      '      sin(u_time * 0.5 + s * 6.28) * 0.02,',
      '      cos(u_time * 0.6 + s * 4.10) * 0.02,',
      '      sin(u_time * 0.45 + s * 5.20) * 0.02',
      '    );',
      '    pos += drift;',
      '  }',
      '  float rot = u_rotation * (t > 0.5 ? 1.08 : 1.0);',
      '  float cr = cos(rot);',
      '  float sr = sin(rot);',
      '  vec3 q = vec3(pos.x * cr + pos.z * sr, pos.y, -pos.x * sr + pos.z * cr);',
      '  float ct = 0.9781;',
      '  float st = 0.2079;',
      '  q = vec3(q.x, q.y * ct - q.z * st, q.y * st + q.z * ct);',
      '  float d = 3.4 - q.z * 0.45;',
      '  gl_Position = vec4(q.x * 2.12 / (d * u_aspect), q.y * 2.12 / d, 0.0, 1.0);',
      '  if (t > 0.5) {',
      '    gl_PointSize = (2.6 + (q.z + 1.0) * 1.4) * (1.1 + s * 0.35);',
      '  } else {',
      '    gl_PointSize = (2.0 + (q.z + 1.0) * 1.3) * (1.0 + s * 0.25);',
      '  }',
      '  v_type = t;',
      '  v_depth = q.z;',
      '  v_seed = s;',
      '}'
    ].join('\n');

    const fragmentSource = [
      'precision mediump float;',
      'varying float v_type;',
      'varying float v_depth;',
      'varying float v_seed;',
      'void main() {',
      '  float dist = length(gl_PointCoord - vec2(0.5));',
      '  if (dist > 0.5) discard;',
      '  float shape = smoothstep(0.5, 0.06, dist);',
      '  if (v_type > 0.5) {',
      '    vec3 coreColor = vec3(0.969, 0.969, 0.961);',
      '    vec3 haloColor = vec3(0.835, 0.165, 0.220);',
      '    float coreFactor = smoothstep(0.35, 0.0, dist) * (0.6 + v_seed * 0.4);',
      '    vec3 rgb = mix(haloColor, coreColor, coreFactor);',
      '    float alpha = shape * (0.75 + (v_depth + 1.0) * 0.12);',
      '    gl_FragColor = vec4(rgb, alpha);',
      '  } else {',
      '    vec3 wineDark = vec3(0.26, 0.04, 0.06);',
      '    vec3 crimsonMid = vec3(0.733, 0.090, 0.161);',
      '    vec3 crimsonHot = vec3(0.835, 0.165, 0.220);',
      '    vec3 rimWhite = vec3(0.969, 0.969, 0.961);',
      '    vec3 rgb;',
      '    float alpha;',
      '    if (v_depth < 0.0) {',
      '      float factor = (v_depth + 1.0);',
      '      rgb = mix(wineDark, crimsonMid, factor * 0.65);',
      '      alpha = shape * (0.28 + factor * 0.32);',
      '    } else {',
      '      float factor = v_depth;',
      '      rgb = mix(crimsonMid, crimsonHot, factor * 0.7);',
      '      if (v_seed > 0.92 && v_depth > 0.25) {',
      '        rgb = mix(rgb, rimWhite, 0.75);',
      '      }',
      '      alpha = shape * (0.62 + factor * 0.33);',
      '    }',
      '    gl_FragColor = vec4(rgb, alpha);',
      '  }',
      '}'
    ].join('\n');

    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);

    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Shader link failed');
    }

    gl.useProgram(program);

    function pseudoRandom(seed) {
      const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return s - Math.floor(s);
    }

    const pts = [];
    const shellCount = 2400;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < shellCount; i++) {
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / shellCount);
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);
      const seed = pseudoRandom(i + 1);
      pts.push(x, y, z, 0.0, seed);
    }

    const clusterCenters = [
      { cx: -0.10, cy: 0.08, cz: 0.06, count: 220, spread: 0.16 },
      { cx: 0.12, cy: -0.06, cz: -0.05, count: 180, spread: 0.14 },
      { cx: -0.02, cy: 0.14, cz: -0.08, count: 160, spread: 0.14 },
      { cx: 0.04, cy: -0.11, cz: 0.10, count: 140, spread: 0.13 }
    ];

    let seedCounter = shellCount + 100;
    for (const cluster of clusterCenters) {
      for (let j = 0; j < cluster.count; j++) {
        seedCounter++;
        const u1 = pseudoRandom(seedCounter * 1.13);
        const u2 = pseudoRandom(seedCounter * 2.37);
        const u3 = pseudoRandom(seedCounter * 3.71);
        const r = cluster.spread * Math.sqrt(-2 * Math.log(Math.max(u1, 0.001)));
        const theta = 2 * Math.PI * u2;
        const phi = Math.acos(2 * u3 - 1);
        const x = cluster.cx + r * Math.sin(phi) * Math.cos(theta);
        const y = cluster.cy + r * Math.sin(phi) * Math.sin(theta);
        const z = cluster.cz + r * Math.cos(phi);
        const seed = pseudoRandom(seedCounter * 4.93);
        pts.push(x, y, z, 1.0, seed);
      }
    }

    const totalVertices = pts.length / 5;

    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);

    const stride = 20; // 5 floats * 4 bytes
    const posLoc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);

    const typeLoc = gl.getAttribLocation(program, 't');
    gl.enableVertexAttribArray(typeLoc);
    gl.vertexAttribPointer(typeLoc, 1, gl.FLOAT, false, stride, 12);

    const seedLoc = gl.getAttribLocation(program, 's');
    gl.enableVertexAttribArray(seedLoc);
    gl.vertexAttribPointer(seedLoc, 1, gl.FLOAT, false, stride, 16);

    uTime = gl.getUniformLocation(program, 'u_time');
    uRotation = gl.getUniformLocation(program, 'u_rotation');
    uAspect = gl.getUniformLocation(program, 'u_aspect');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    function draw(time) {
      raf = 0;
      if (disposed || document.hidden || !visible) return;

      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
      last = time;
      totalTime += dt;
      angle += dt * 0.13;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, totalTime);
      gl.uniform1f(uRotation, angle + window.scrollY * 0.00035);
      gl.uniform1f(uAspect, w / Math.max(h, 1));
      gl.drawArrays(gl.POINTS, 0, totalVertices);

      raf = requestAnimationFrame(draw);
    }

    function request() {
      if (!raf && !disposed && !document.hidden && visible) {
        last = 0;
        raf = requestAnimationFrame(draw);
      }
    }

    schedule = () => {
      if (document.hidden || !visible) {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
        last = 0;
      } else {
        request();
      }
    };

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          visible = Boolean(entries[0]?.isIntersecting);
          schedule();
        },
        { threshold: 0.02 }
      );
      observer.observe(canvas);
    }

    if (typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver(request);
      resize.observe(canvas);
    }

    document.addEventListener('visibilitychange', schedule);
    canvas.addEventListener('webglcontextlost', contextLost);

    canvas.hidden = false;
    if (poster) {
      poster.style.visibility = 'hidden';
    }
    request();

    dispose.isDisposed = () => disposed;
    dispose.isVisible = () => visible;
    dispose.isPaused = () => Boolean(disposed || document.hidden || !visible || !raf);
    dispose.getGl = () => gl;

    return dispose;
  } catch (error) {
    dispose();
    throw error;
  }
}

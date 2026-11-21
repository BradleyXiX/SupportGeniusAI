// Native WebGL point geometry for Signal Core.
// Single owner for camera rotation and canvas drawing.
// Preserves DPR <= 1.5, cancels RAF when hidden/offscreen, cleans up on dispose.
// Adds fine-pointer hover tilt (capped at ±6°), shell wave displacement (+12%), and touch fallback.

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
  let uDpr;
  let uTilt;
  let uDispMult;
  let schedule = () => {};
  let observer;
  let resize;

  // Cached dimensions — eliminates per-frame layout measurements
  let cachedWidth = 0;
  let cachedHeight = 0;
  let cachedDpr = 1;
  let cachedDprWidth = 0;
  let cachedDprHeight = 0;

  // Hover tilt & displacement state (delta-time smoothed over ~250-400ms)
  let targetTiltX = 0;
  let targetTiltY = 0;
  let targetDispMult = 1.0;
  let currentTiltX = 0;
  let currentTiltY = 0;
  let currentDispMult = 1.0;
  let cachedStageRect = null;

  const stage = canvas.closest('.core-stage') || canvas;

  function updateDimensions(entry) {
    if (entry && entry.contentRect) {
      cachedWidth = entry.contentRect.width;
      cachedHeight = entry.contentRect.height;
    } else {
      const r = canvas.getBoundingClientRect();
      cachedWidth = r.width;
      cachedHeight = r.height;
    }
    cachedDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cachedDprWidth = Math.round(cachedWidth * cachedDpr);
    cachedDprHeight = Math.round(cachedHeight * cachedDpr);

    if (cachedDprWidth > 0 && cachedDprHeight > 0) {
      if (canvas.width !== cachedDprWidth || canvas.height !== cachedDprHeight) {
        canvas.width = cachedDprWidth;
        canvas.height = cachedDprHeight;
        gl.viewport(0, 0, cachedDprWidth, cachedDprHeight);
      }
    }
  }

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

  const onPointerEnter = (e) => {
    if (e.pointerType === 'touch') return;
    cachedStageRect = stage.getBoundingClientRect();
  };

  const onPointerMove = (e) => {
    // Touch fallback: ambient motion runs without hover dependence
    if (e.pointerType === 'touch') return;
    if (!cachedStageRect) {
      cachedStageRect = stage.getBoundingClientRect();
    }
    const width = cachedStageRect.width || 1;
    const height = cachedStageRect.height || 1;
    const nx = Math.max(-1, Math.min(1, ((e.clientX - cachedStageRect.left) / width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - cachedStageRect.top) / height) * 2 - 1));

    // Pitch: tilt upward when pointer is above center; capped at ±6° (0.1047 rad)
    targetTiltX = -ny * 0.1047;
    // Yaw: tilt rightward when pointer is to the right; capped at ±6° (0.1047 rad)
    targetTiltY = nx * 0.1047;
    // Shell wave displacement +12% on hover
    targetDispMult = 1.12;
    request();
  };

  const onPointerLeave = () => {
    targetTiltX = 0;
    targetTiltY = 0;
    targetDispMult = 1.0;
    cachedStageRect = null;
    request();
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

    stage.removeEventListener('pointerenter', onPointerEnter);
    stage.removeEventListener('pointermove', onPointerMove);
    stage.removeEventListener('pointerleave', onPointerLeave);

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
      'uniform float u_dpr;',
      'uniform vec2 u_tilt;',
      'uniform float u_disp_mult;',
      'varying float v_type;',
      'varying float v_depth;',
      'varying float v_seed;',
      'void main() {',
      '  vec3 pos = p;',
      '  if (t < 0.5) {',
      '    float disp = sin(pos.x * 3.5 + u_time * 0.75) * cos(pos.y * 3.2 + u_time * 0.60) * 0.08',
      '               + sin(pos.z * 4.0 - u_time * 0.85) * 0.06',
      '               + sin(pos.x * pos.z * 5.0 + u_time * 1.10) * 0.04;',
      '    pos *= (1.0 + disp * u_disp_mult);',
      '  } else {',
      '    vec3 drift = vec3(',
      '      sin(u_time * 0.4 + pos.x * 2.5) * 0.015,',
      '      cos(u_time * 0.5 + pos.y * 2.5) * 0.015,',
      '      sin(u_time * 0.35 + pos.z * 2.5) * 0.015',
      '    );',
      '    pos += drift;',
      '  }',
      '  float rot = u_rotation + u_tilt.y;',
      '  float cr = cos(rot);',
      '  float sr = sin(rot);',
      '  vec3 q = vec3(pos.x * cr + pos.z * sr, pos.y, -pos.x * sr + pos.z * cr);',
      '  float tiltPitch = 0.2079 + u_tilt.x;',
      '  float ct = cos(tiltPitch);',
      '  float st = sin(tiltPitch);',
      '  q = vec3(q.x, q.y * ct - q.z * st, q.y * st + q.z * ct);',
      '  float d = 3.4 - q.z * 0.45;',
      '  gl_Position = vec4(q.x * 2.12 / (d * u_aspect), q.y * 2.12 / d, 0.0, 1.0);',
      '  if (t > 0.5) {',
      '    float baseSize = (s > 0.40) ? 2.5 : 2.0;',
      '    gl_PointSize = (baseSize + (q.z + 1.0) * 0.8) * u_dpr;',
      '  } else {',
      '    gl_PointSize = (2.0 + (q.z + 1.0) * 0.75) * (0.88 + s * 0.24) * u_dpr;',
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
      '  float shape = 1.0 - smoothstep(0.06, 0.5, dist);',
      '  if (v_type > 0.5) {',
      '    vec3 crimsonDeep = vec3(0.55, 0.06, 0.10);',
      '    vec3 crimsonVibrant = vec3(0.733, 0.090, 0.161);',
      '    vec3 whiteWarm = vec3(0.969, 0.969, 0.961);',
      '    if (v_seed > 0.40) {',
      '      float coreFactor = 1.0 - smoothstep(0.0, 0.38, dist);',
      '      vec3 rgb = mix(crimsonVibrant, whiteWarm, coreFactor * coreFactor);',
      '      float alpha = shape * (0.85 + (v_depth + 1.0) * 0.10);',
      '      gl_FragColor = vec4(rgb, alpha);',
      '    } else {',
      '      vec3 rgb = mix(crimsonDeep, crimsonVibrant, 0.5 + v_depth * 0.5);',
      '      float alpha = shape * (0.65 + (v_depth + 1.0) * 0.20);',
      '      gl_FragColor = vec4(rgb, alpha);',
      '    }',
      '  } else {',
      '    vec3 wineDark = vec3(0.48, 0.06, 0.10);',
      '    vec3 crimsonMid = vec3(0.733, 0.090, 0.161);',
      '    vec3 crimsonHot = vec3(0.86, 0.12, 0.20);',
      '    vec3 rimWhite = vec3(0.969, 0.969, 0.961);',
      '    vec3 rgb;',
      '    float alpha;',
      '    if (v_depth < 0.0) {',
      '      float factor = (v_depth + 1.0);',
      '      rgb = mix(wineDark, crimsonMid, factor * 0.70);',
      '      alpha = shape * (0.42 + factor * 0.35);',
      '    } else {',
      '      float factor = v_depth;',
      '      rgb = mix(crimsonMid, crimsonHot, factor * 0.75);',
      '      if (v_seed > 0.93 && v_depth > 0.20) {',
      '        rgb = mix(rgb, rimWhite, 0.85);',
      '      }',
      '      alpha = shape * (0.68 + factor * 0.30);',
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
    const shellCount = 3200;
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
      { cx: -0.24, cy: 0.16, cz: 0.12, count: 160, spread: 0.075 },
      { cx: 0.22, cy: -0.15, cz: 0.10, count: 150, spread: 0.070 },
      { cx: 0.18, cy: 0.20, cz: -0.14, count: 140, spread: 0.070 },
      { cx: -0.20, cy: -0.18, cz: -0.12, count: 130, spread: 0.065 },
      { cx: 0.02, cy: 0.03, cz: -0.02, count: 120, spread: 0.060 }
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
    uDpr = gl.getUniformLocation(program, 'u_dpr');
    uTilt = gl.getUniformLocation(program, 'u_tilt');
    uDispMult = gl.getUniformLocation(program, 'u_disp_mult');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    // Initial dimension calculation before first frame
    updateDimensions();

    function draw(time) {
      raf = 0;
      if (disposed || document.hidden || !visible) return;

      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
      last = time;
      totalTime += dt;
      angle += dt * 0.13;

      // Delta-time smoothing over ~250-400ms for hover tilt and displacement
      const blend = dt > 0 ? (1.0 - Math.exp(-dt * 8.0)) : 1.0;
      currentTiltX += (targetTiltX - currentTiltX) * blend;
      currentTiltY += (targetTiltY - currentTiltY) * blend;
      currentDispMult += (targetDispMult - currentDispMult) * blend;

      if (cachedDprWidth <= 0 || cachedDprHeight <= 0) {
        updateDimensions();
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, totalTime);
      gl.uniform1f(uRotation, angle + window.scrollY * 0.00035);
      gl.uniform1f(uAspect, cachedDprWidth / Math.max(cachedDprHeight, 1));
      gl.uniform1f(uDpr, cachedDpr);
      gl.uniform2f(uTilt, currentTiltX, currentTiltY);
      gl.uniform1f(uDispMult, currentDispMult);
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
      resize = new ResizeObserver((entries) => {
        if (entries[0]) {
          updateDimensions(entries[0]);
        }
        request();
      });
      resize.observe(canvas);
    }

    stage.addEventListener('pointerenter', onPointerEnter);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerleave', onPointerLeave);

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
    dispose.getTilt = () => ({ x: currentTiltX, y: currentTiltY, targetX: targetTiltX, targetY: targetTiltY });
    dispose.getDispMult = () => ({ current: currentDispMult, target: targetDispMult });

    return dispose;
  } catch (error) {
    dispose();
    throw error;
  }
}

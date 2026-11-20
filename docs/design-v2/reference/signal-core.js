// Native WebGL point geometry. One owner for camera rotation and canvas drawing.
export function mountCore(canvas, poster, { onDispose = () => {} } = {}) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!gl) throw new Error('WebGL unavailable');
  const shaders = [];
  let program, buffer, raf = 0, disposed = false, visible = true, angle = 0, last = 0;
  let rotation, aspect, schedule = () => {};
  const compile = (type, source) => {
    const shader = gl.createShader(type); shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
    return shader;
  };
  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(raf); observer?.disconnect(); resize?.disconnect();
    document.removeEventListener('visibilitychange', schedule);
    canvas.removeEventListener('webglcontextlost', contextLost);
    if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); shaders.forEach(shader => gl.deleteShader(shader));
    canvas.hidden = true; poster.style.visibility = 'visible'; onDispose();
  }
  let observer, resize;
  function contextLost(event) { event.preventDefault(); dispose(); }
  try {
    const vertex = compile(gl.VERTEX_SHADER, 'attribute vec3 p; uniform float r; uniform float a; varying float light; void main(){ float c=cos(r),s=sin(r); vec3 q=vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c); float d=3.3-q.z*.35; gl_Position=vec4(q.x*2.2/(d*a),q.y*2.2/d,0.,1.); gl_PointSize=2.0+(q.z+1.)*1.5; light=.28+(q.z+1.)*.32; }');
    const fragment = compile(gl.FRAGMENT_SHADER, 'precision mediump float; varying float light; void main(){if(distance(gl_PointCoord,vec2(.5))>.5) discard; gl_FragColor=vec4(.80,.88,.82,light);}');
    program=gl.createProgram(); gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Shader link failed');
    gl.useProgram(program); const pts=[]; const count=1300;
    for(let i=0;i<count;i++){const y=1-2*(i+.5)/count; if((y>.18&&y<.27)||(y<-.18&&y>-.27))continue; const rad=Math.sqrt(1-y*y),theta=i*Math.PI*(3-Math.sqrt(5));pts.push(Math.cos(theta)*rad,y,Math.sin(theta)*rad);}
    buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pts),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,3,gl.FLOAT,false,0,0);
    rotation=gl.getUniformLocation(program,'r');aspect=gl.getUniformLocation(program,'a');
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
    function draw(time){
      raf=0;if(disposed||document.hidden||!visible)return;
      const dt=last?Math.min((time-last)/1000,.05):0;last=time;angle+=dt*.13;
      const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);
      const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
      gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(rotation,angle+window.scrollY*.00035);gl.uniform1f(aspect,w/Math.max(h,1));gl.drawArrays(gl.POINTS,0,pts.length/3);
      raf=requestAnimationFrame(draw);
    }
    function request(){if(!raf&&!disposed&&!document.hidden&&visible){last=0;raf=requestAnimationFrame(draw);}}
    schedule=()=>{if(document.hidden||!visible){cancelAnimationFrame(raf);raf=0;last=0;}else request();};
    observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.02});observer.observe(canvas);
    resize=new ResizeObserver(request);resize.observe(canvas);
    document.addEventListener('visibilitychange',schedule);canvas.addEventListener('webglcontextlost',contextLost);
    canvas.hidden=false;poster.style.visibility='hidden';request();return dispose;
  } catch(error){dispose();throw error;}
}

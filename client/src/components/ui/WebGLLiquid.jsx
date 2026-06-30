import React, { useEffect, useMemo, useRef, useState } from "react";

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_colorDeep;
uniform vec3 u_colorMid;
uniform vec3 u_colorHighlight;
uniform float u_speed;
uniform float u_flowStrength;
uniform float u_grain;
uniform float u_contrast;
uniform float u_opacity;
uniform float u_reveal;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.86, 0.51, -0.51, 0.86);
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}
vec3 applyContrast(vec3 c, float contrast) {
  return clamp((c - 0.5) * contrast + 0.5, 0.0, 1.0);
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * (0.14 * u_speed);
  vec2 aspect = vec2(u_res.x / max(u_res.y, 1.0), 1.0);
  vec2 p = (uv - 0.5) * aspect;

  vec2 flowP = vec2(p.x * 1.1, p.y - t * 0.35);
  float n1 = fbm(flowP * 2.8 + vec2(0.0, t * 0.2));
  float n2 = fbm((flowP + n1 * 0.45) * 4.0 - vec2(0.0, t * 0.35));
  float n3 = fbm((flowP + n2 * 0.4) * 6.5 + vec2(t * 0.15, 0.0));

  float structure = n3 * 1.15 + (n2 - 0.5) * 0.5;
  structure += (n1 - 0.5) * 0.3 * u_flowStrength;

  float lowBand = smoothstep(0.18, 0.6, structure);
  float highBand = smoothstep(0.62, 1.08, structure);
  vec3 col = mix(u_colorDeep, u_colorMid, lowBand);
  col = mix(col, u_colorHighlight, highBand);

  float glow = smoothstep(0.52, 0.95, structure) * (0.35 + 0.5 * u_flowStrength);
  col += glow * u_colorHighlight * 0.35;

  float verticalMask = smoothstep(1.05, 0.05, uv.y);
  verticalMask = pow(verticalMask, 1.1);
  float vignette = smoothstep(1.28, 0.36, length(uv - 0.5));
  col *= mix(0.9, 1.05, vignette);
  col = applyContrast(col, u_contrast);

  float dither = (hash(gl_FragCoord.xy + t * 10.0) - 0.5) * u_grain;
  col += dither;

  float alpha = verticalMask * smoothstep(0.08, 0.95, structure);
  alpha *= smoothstep(0.0, 0.28, u_reveal - uv.x);
  alpha *= u_opacity;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
}
`;

function hexToRgb01(hex) {
  const normalized = hex.replace("#", "");
  return [
    parseInt(normalized.slice(0, 2), 16) / 255,
    parseInt(normalized.slice(2, 4), 16) / 255,
    parseInt(normalized.slice(4, 6), 16) / 255,
  ];
}

export function WebGLLiquid({
  colorDeep = "#08090a",
  colorMid = "#1c1f24", // Mapbox Gunmetal Dark Grey
  colorHighlight = "#333943", // Mapbox Steel Grey
  speed = 0.8,
  flowStrength = 0.95,
  grain = 0.04,
  contrast = 1.05,
  opacity = 0.75,
  reveal = true,
  delayMs = 0,
  revealDuration = 1.2,
  children,
  className = "",
  style = {},
}) {
  const canvasRef = useRef(null);
  const hostRef = useRef(null);
  const [hasError, setHasError] = useState(false);

  const settings = useMemo(
    () => ({ colorDeep, colorMid, colorHighlight, speed, flowStrength, grain, contrast, opacity, reveal, delayMs, revealDuration }),
    [colorDeep, colorMid, colorHighlight, speed, flowStrength, grain, contrast, opacity, reveal, delayMs, revealDuration]
  );

  useEffect(() => {
    if (hasError) return;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    try {
      const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
      if (!gl) { setHasError(true); return; }

      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
      };

      const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
      const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      if (!vs || !fs) { setHasError(true); return; }

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setHasError(true); return; }
      gl.useProgram(prog);

      const pos = gl.getAttribLocation(prog, "position");
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

      const u = (n) => gl.getUniformLocation(prog, n);
      const uRes = u("u_res"), uTime = u("u_time"), uDeep = u("u_colorDeep"),
            uMid = u("u_colorMid"), uHigh = u("u_colorHighlight"),
            uSpeed = u("u_speed"), uFlow = u("u_flowStrength"),
            uGrain = u("u_grain"), uContrast = u("u_contrast"),
            uOpacity = u("u_opacity"), uReveal = u("u_reveal");

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const { width, height } = host.getBoundingClientRect();
        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
      };

      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      let raf = 0;
      const start = performance.now();

      const render = (now) => {
        const elapsed = Math.max(0, (now - start - settings.delayMs) / 1000);
        const rev = settings.reveal ? Math.min(1, elapsed / Math.max(settings.revealDuration, 0.05)) : 1;
        const deep = hexToRgb01(settings.colorDeep);
        const mid = hexToRgb01(settings.colorMid);
        const hi = hexToRgb01(settings.colorHighlight);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(uTime, elapsed);
        gl.uniform3f(uDeep, ...deep);
        gl.uniform3f(uMid, ...mid);
        gl.uniform3f(uHigh, ...hi);
        gl.uniform1f(uSpeed, settings.speed);
        gl.uniform1f(uFlow, settings.flowStrength);
        gl.uniform1f(uGrain, settings.grain);
        gl.uniform1f(uContrast, settings.contrast);
        gl.uniform1f(uOpacity, settings.opacity);
        gl.uniform1f(uReveal, rev);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        raf = requestAnimationFrame(render);
      };

      raf = requestAnimationFrame(render);

      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        gl.deleteBuffer(buf);
        gl.deleteProgram(prog);
      };
    } catch {
      setHasError(true);
    }
  }, [hasError, settings]);

  return (
    <div
      ref={hostRef}
      className={`relative w-full overflow-hidden bg-[#0e1012] ${className}`}
      style={style}
    >
      {!hasError && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ width: "100%", height: "100%", display: "block", mixBlendMode: "screen" }}
        />
      )}
      {hasError && (
        <div className="absolute inset-0 bg-[#0e1012]" />
      )}
      {children}
    </div>
  );
}

export default WebGLLiquid;

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  Quaternion,
  Scene,
  ShaderMaterial,
  Vector3,
  type Curve,
} from 'three';
import { buildShape, type ShapeId } from './devices';

/*
 * Things that fly, built from points: an aircraft cloud that assembles out of scattered points and bursts
 * apart under gravity on impact, a glowing trail that follows a curve, and an impact flash.
 */

const CLOUD_VERT = /* glsl */ `
  attribute vec3 aScatter;
  attribute vec3 aDir;
  attribute float aRand;
  attribute vec4 aHub;
  uniform float uAssemble;
  uniform float uSpin;
  uniform float uSpinAxis;
  uniform float uBurst;
  uniform float uBurstR;
  uniform float uScale;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uFog;
  uniform vec3 uBase;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float delay = aRand * 0.45;
    float e = smoothstep(delay, delay + 0.55, uAssemble);
    float ee = 1.0 - pow(1.0 - e, 3.0);
    vec3 local = position;
    if (aHub.w != 0.0) {
      float a = uSpin * aHub.w;
      float c = cos(a);
      float s = sin(a);
      vec3 d = local - aHub.xyz;
      d = uSpinAxis > 0.5
        ? vec3(d.x, d.y * c - d.z * s, d.y * s + d.z * c)
        : vec3(d.x * c - d.z * s, d.y, d.x * s + d.z * c);
      local = aHub.xyz + d;
    }
    vec3 p = mix(position + aScatter, local, ee);
    p += 0.01 * uScale * vec3(sin(uTime * 2.1 + aRand * 40.0), cos(uTime * 1.7 + aRand * 30.0), 0.0);

    vec4 world = modelMatrix * vec4(p, 1.0);
    float b = uBurst;
    world.xyz += aDir * uBurstR * (1.0 - pow(1.0 - b, 2.0)) * (0.4 + aRand * 0.9);
    world.y -= b * b * uBurstR * 0.9;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;

    float hot = b > 0.0 ? 1.0 - smoothstep(0.0, 0.5, b) : 0.0;
    float size = (1.0 + aRand * 0.35) * (1.0 + hot * 1.4);
    gl_PointSize = min(uSize * uPixelRatio * size * (20.0 / -mv.z), 6.0 * uPixelRatio);

    float h = clamp(position.y / max(uScale, 0.001) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uColorA, uColorB, h * 0.8 + aRand * 0.2);
    col = mix(uBase, col, 0.6);
    vColor = mix(col, vec3(1.0, 0.85, 0.95), hot);
    vAlpha = (0.55 + aRand * 0.45) * e * (1.0 - smoothstep(0.45, 1.0, b)) * smoothstep(uFog, 8.0, -mv.z);
  }
`;

const FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    gl_FragColor = vec4(vColor, smoothstep(0.5, 0.05, r) * vAlpha * uOpacity);
  }
`;

const TRAIL_VERT = /* glsl */ `
  attribute float aT;
  attribute float aRand;
  uniform float uHead;
  uniform float uLen;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform vec3 uColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float behind = uHead - aT;
    float on = step(0.0, behind) * step(0.0005, uHead);
    float fade = on * (1.0 - smoothstep(0.0, uLen, behind));
    vec3 p = position + 0.06 * (1.0 + behind * 18.0) * vec3(sin(aRand * 50.0 + uTime), cos(aRand * 70.0 + uTime * 0.8), sin(aRand * 30.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.6 + fade) * (20.0 / -mv.z);
    vColor = mix(uColor, vec3(1.0), smoothstep(0.02, 0.0, behind) * 0.7);
    vAlpha = fade * (0.5 + aRand * 0.5);
  }
`;

const FLASH_VERT = /* glsl */ `
  attribute float aRand;
  attribute vec3 aDir;
  uniform float uFlash;
  uniform float uRadius;
  uniform float uSize;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float t = clamp(uFlash, 0.0, 1.0);
    vec3 p = position + aDir * uRadius * (1.0 - pow(1.0 - t, 3.0)) * (0.3 + aRand);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float core = step(aRand, 0.06);
    gl_PointSize = uSize * uPixelRatio * (core > 0.5 ? 9.0 * (1.0 - t) : 1.0 + aRand) * (20.0 / -mv.z);
    vColor = mix(vec3(1.0, 0.55, 0.9), vec3(1.0), core);
    vAlpha = step(0.0001, t) * (1.0 - smoothstep(0.2, 1.0, t)) * (core > 0.5 ? 1.0 : 0.8);
  }
`;

const PAD_VERT = /* glsl */ `
  attribute float aKind;
  attribute float aRand;
  attribute vec3 aDir;
  uniform float uReady;
  uniform float uDust;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uFog;
  uniform vec3 uBase;
  uniform vec3 uAccent;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float alpha;
    float size = 1.0 + aRand * 0.3;
    vec3 col = mix(uBase, uAccent, 0.55);
    if (aKind < 0.5) {
      /* Plate and legs. */
      alpha = smoothstep(aRand * 0.5, aRand * 0.5 + 0.5, uReady) * (0.6 + aRand * 0.4);
    } else if (aKind < 1.5) {
      /* Ground marking: a ring that breathes while the interceptor waits. */
      float pulse = 0.65 + 0.35 * sin(uTime * 2.4 - aRand * 6.0);
      alpha = uReady * pulse * 0.75 * (1.0 - uDust * 0.6);
      col = uAccent;
      size *= 1.25;
    } else {
      /* Rotor downwash: dust pushed out over the ground as it lifts off. */
      float t = clamp(uDust * 1.4 - aRand * 0.4, 0.0, 1.0);
      p += aDir * t * (1.6 + aRand * 2.2);
      p.y += t * (0.15 + aRand * 0.35);
      alpha = step(0.001, t) * (1.0 - t) * 0.9;
      col = mix(uBase, vec3(1.0), 0.3);
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * uPixelRatio * size * (20.0 / -mv.z), 5.0 * uPixelRatio);
    vColor = col;
    vAlpha = alpha * smoothstep(uFog, 8.0, -mv.z);
  }
`;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function unit(r: () => number) {
  const u = r() * 2 - 1;
  const a = r() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [s * Math.cos(a), u, s * Math.sin(a)];
}

function material(vertexShader: string, uniforms: Record<string, { value: unknown }>) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

interface CloudOptions {
  scene: Scene;
  shape: ShapeId;
  count: number;
  scale: number;
  pixelRatio: number;
  colors: { base: Color; a: Color; b: Color };
  size?: number;
  fog?: number;
  seed?: number;
  /* Axis rotors spin about: 'y' for lift rotors, 'x' for a pusher prop. */
  spinAxis?: 'x' | 'y';
}

const UP = new Vector3(0, 1, 0);
const NOSE_X = new Vector3(1, 0, 0);

/* An aircraft made of points. Move it with `place`; `axis` says which local axis is its nose. */
export function createCloud(o: CloudOptions) {
  const { shape, hub: hubs } = buildShape(o.shape, o.count, 4000 + o.count);
  const r = rng(o.count * 7 + (o.seed ?? 0));
  const n = o.count;
  const pos = new Float32Array(n * 3);
  const scatter = new Float32Array(n * 3);
  const dir = new Float32Array(n * 3);
  const rand = new Float32Array(n);
  const hub = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    hub.set([hubs[i * 4] * o.scale, hubs[i * 4 + 1] * o.scale, hubs[i * 4 + 2] * o.scale, hubs[i * 4 + 3]], i * 4);
    pos[i * 3] = shape[i * 3] * o.scale;
    pos[i * 3 + 1] = shape[i * 3 + 1] * o.scale;
    pos[i * 3 + 2] = shape[i * 3 + 2] * o.scale;
    const s = unit(r);
    const d = (1.5 + r() * 2.5) * o.scale;
    scatter.set([s[0] * d, s[1] * d - o.scale * 1.2, s[2] * d], i * 3);
    dir.set(unit(r), i * 3);
    rand[i] = r();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aScatter', new BufferAttribute(scatter, 3));
  g.setAttribute('aDir', new BufferAttribute(dir, 3));
  g.setAttribute('aRand', new BufferAttribute(rand, 1));
  g.setAttribute('aHub', new BufferAttribute(hub, 4));

  const uniforms = {
    uAssemble: { value: 0 },
    uSpin: { value: 0 },
    uSpinAxis: { value: o.spinAxis === 'x' ? 1 : 0 },
    uBurst: { value: 0 },
    uBurstR: { value: o.scale * 3 },
    uScale: { value: o.scale },
    uTime: { value: 0 },
    uSize: { value: o.size ?? 1.6 },
    uPixelRatio: { value: o.pixelRatio },
    uFog: { value: o.fog ?? 90 },
    uOpacity: { value: 1 },
    uBase: { value: o.colors.base },
    uColorA: { value: o.colors.a },
    uColorB: { value: o.colors.b },
  };
  const points = new Points(g, material(CLOUD_VERT, uniforms));
  points.frustumCulled = false;
  o.scene.add(points);

  const q = new Quaternion();
  /* Puts the cloud at `at`, turning its `nose` axis (local) to `heading` (world). */
  function place(at: Vector3, heading?: Vector3, nose: 'up' | 'x' = 'up') {
    points.position.copy(at);
    if (heading && heading.lengthSq() > 1e-6) {
      q.setFromUnitVectors(nose === 'up' ? UP : NOSE_X, heading.clone().normalize());
      points.quaternion.copy(q);
    } else {
      points.quaternion.identity();
    }
  }

  let lastTime = 0;
  /* `spin` is the rotor speed in radians per second. */
  function update(time: number, assemble: number, burst: number, opacity: number, spin = 0) {
    const dt = Math.min(0.1, Math.max(0, time - lastTime));
    lastTime = time;
    uniforms.uSpin.value = (uniforms.uSpin.value + spin * dt) % (Math.PI * 200);
    uniforms.uTime.value = time;
    uniforms.uAssemble.value = assemble;
    uniforms.uBurst.value = burst;
    uniforms.uOpacity.value = opacity;
    points.visible = opacity > 0.001 && assemble > 0.001 && burst < 0.999;
  }

  return { points, uniforms, place, update };
}

interface TrailOptions {
  scene: Scene;
  curve: Curve<Vector3>;
  count: number;
  pixelRatio: number;
  color: Color;
  size?: number;
  /* Visible length behind the head, as a share of the curve. */
  length?: number;
}

/* A glowing streak along `curve`; `head` (0-1) is how far along it the aircraft is. */
export function createTrail(o: TrailOptions) {
  const r = rng(o.count * 13);
  const pos = new Float32Array(o.count * 3);
  const t = new Float32Array(o.count);
  const rand = new Float32Array(o.count);
  const p = new Vector3();
  for (let i = 0; i < o.count; i++) {
    const k = i / (o.count - 1);
    o.curve.getPoint(k, p);
    pos.set([p.x, p.y, p.z], i * 3);
    t[i] = k;
    rand[i] = r();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aT', new BufferAttribute(t, 1));
  g.setAttribute('aRand', new BufferAttribute(rand, 1));
  const uniforms = {
    uHead: { value: 0 },
    uLen: { value: o.length ?? 0.35 },
    uSize: { value: o.size ?? 1.4 },
    uPixelRatio: { value: o.pixelRatio },
    uTime: { value: 0 },
    uColor: { value: o.color },
    uOpacity: { value: 1 },
  };
  const points = new Points(g, material(TRAIL_VERT, uniforms));
  points.frustumCulled = false;
  o.scene.add(points);

  function update(time: number, head: number, opacity: number) {
    uniforms.uTime.value = time;
    uniforms.uHead.value = head;
    uniforms.uOpacity.value = opacity;
    points.visible = opacity > 0.001 && head > 0.0005;
  }

  return { points, update };
}

interface PadOptions {
  scene: Scene;
  /* Centre of the pad on the ground. */
  at: Vector3;
  /* Half the plate's width. */
  size: number;
  /* Ground height, so the legs and markings follow the relief. */
  groundAt: (x: number, z: number) => number;
  pixelRatio: number;
  colors: { base: Color; accent: Color };
  high: boolean;
  fog?: number;
}

/*
 * A launch pad that stands on the relief: a square plate on four legs reaching down to the ground, a ring
 * marked on the terrain around it, and dust blown outward when the interceptor lifts off.
 * `top` is the height of the plate, where the interceptor stands.
 */
export function createLaunchPad(o: PadOptions) {
  const r = rng(911);
  const s = o.size;
  const corners = [
    [-s, -s],
    [s, -s],
    [s, s],
    [-s, s],
  ].map(([x, z]) => new Vector3(o.at.x + x, o.groundAt(o.at.x + x, o.at.z + z), o.at.z + z));
  const top = Math.max(o.at.y, ...corners.map((c) => c.y)) + s * 0.35;

  const pos: number[] = [];
  const kind: number[] = [];
  const rand: number[] = [];
  const dir: number[] = [];
  const push = (x: number, y: number, z: number, k: number, d: [number, number, number] = [0, 0, 0]) => {
    pos.push(x, y, z);
    kind.push(k);
    rand.push(r());
    dir.push(...d);
  };
  const q = o.high ? 1 : 0.6;

  /* Plate: outline, a sparse fill and an H. */
  for (let i = 0; i < 320 * q; i++) {
    const e = i % 4;
    const k = r() * 2 - 1;
    const [x, z] = e === 0 ? [k * s, -s] : e === 1 ? [s, k * s] : e === 2 ? [k * s, s] : [-s, k * s];
    push(o.at.x + x, top, o.at.z + z, 0);
  }
  for (let i = 0; i < 260 * q; i++) push(o.at.x + (r() * 2 - 1) * s, top, o.at.z + (r() * 2 - 1) * s, 0);
  for (let i = 0; i < 120 * q; i++) {
    const k = r() * 2 - 1;
    const part = i % 3;
    const [x, z] = part === 0 ? [-s * 0.4, k * s * 0.5] : part === 1 ? [s * 0.4, k * s * 0.5] : [k * s * 0.4, 0];
    push(o.at.x + x, top + 0.01, o.at.z + z, 0);
  }
  /* Legs, from each corner down into the ground. */
  corners.forEach((c) => {
    for (let i = 0; i < 60 * q; i++) {
      const k = r();
      push(c.x * 0.92 + o.at.x * 0.08, c.y + (top - c.y) * k, c.z * 0.92 + o.at.z * 0.08, 0);
    }
  });
  /* Marking ring on the terrain. */
  const ringR = s * 2.4;
  for (let i = 0; i < 260 * q; i++) {
    const a = r() * Math.PI * 2;
    const rr = ringR + (r() - 0.5) * 0.08;
    const x = o.at.x + Math.cos(a) * rr;
    const z = o.at.z + Math.sin(a) * rr;
    push(x, o.groundAt(x, z) + 0.04, z, 1);
  }
  /* Dust, lying on the ground under the pad until lift-off. */
  for (let i = 0; i < 420 * q; i++) {
    const a = r() * Math.PI * 2;
    const rr = s * (0.6 + r() * 1.4);
    const x = o.at.x + Math.cos(a) * rr;
    const z = o.at.z + Math.sin(a) * rr;
    push(x, o.groundAt(x, z) + 0.05, z, 2, [Math.cos(a), 0, Math.sin(a)]);
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('aKind', new BufferAttribute(new Float32Array(kind), 1));
  g.setAttribute('aRand', new BufferAttribute(new Float32Array(rand), 1));
  g.setAttribute('aDir', new BufferAttribute(new Float32Array(dir), 3));
  const uniforms = {
    uReady: { value: 0 },
    uDust: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: 1.5 },
    uPixelRatio: { value: o.pixelRatio },
    uFog: { value: o.fog ?? 90 },
    uOpacity: { value: 1 },
    uBase: { value: o.colors.base },
    uAccent: { value: o.colors.accent },
  };
  const points = new Points(g, material(PAD_VERT, uniforms));
  points.frustumCulled = false;
  o.scene.add(points);

  function update(time: number, ready: number, dust: number, opacity: number) {
    uniforms.uTime.value = time;
    uniforms.uReady.value = ready;
    uniforms.uDust.value = dust;
    uniforms.uOpacity.value = opacity;
    points.visible = opacity > 0.001 && ready > 0.001;
  }

  return { points, update, top };
}

/* A short burst of light and sparks at `at`; `t` runs 0-1 over the flash. */
export function createFlash(o: { scene: Scene; at: Vector3; pixelRatio: number; radius: number; count?: number }) {
  const n = o.count ?? 260;
  const r = rng(n * 31);
  const pos = new Float32Array(n * 3);
  const dir = new Float32Array(n * 3);
  const rand = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos.set([o.at.x, o.at.y, o.at.z], i * 3);
    dir.set(unit(r), i * 3);
    rand[i] = r();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aDir', new BufferAttribute(dir, 3));
  g.setAttribute('aRand', new BufferAttribute(rand, 1));
  const uniforms = {
    uFlash: { value: 0 },
    uRadius: { value: o.radius },
    uSize: { value: 2.2 },
    uPixelRatio: { value: o.pixelRatio },
    uOpacity: { value: 1 },
  };
  const points = new Points(g, material(FLASH_VERT, uniforms));
  points.frustumCulled = false;
  o.scene.add(points);

  function update(t: number, opacity: number) {
    uniforms.uFlash.value = t;
    uniforms.uOpacity.value = opacity;
    points.visible = opacity > 0.001 && t > 0.0001 && t < 0.999;
  }

  return { points, update };
}

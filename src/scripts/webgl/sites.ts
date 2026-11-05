import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
} from 'three';
import { buildShape, type ShapeId } from './devices';
import { terrainHeight } from './terrain';

/*
 * A protected site built from points: five devices on a ring that grow out of the ground, and a dome rising
 * over them. Plus data streams: lanes of points arcing from a set of sources into one target in the scene.
 */

export const DEVICE_ORDER: ShapeId[] = ['camera', 'radar', 'jammer', 'rfsensor', 'lidar'];
export const DOME = DEVICE_ORDER.length;
const KINDS = DOME + 1;
export const DOME_R = 6.2;
export const PAD_R = 9.5;
const DEVICE_SCALE = 1.2;
const RING = 3.1;

const SITE_VERT = /* glsl */ `
  attribute vec3 aLocal;
  attribute vec3 aPivot;
  attribute float aKind;
  attribute float aSpin;
  attribute float aBeam;
  attribute float aRand;
  attribute float aRank;
  uniform float uGrow[${KINDS}];
  uniform float uTurn[${KINDS}];
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uDomeR;
  uniform float uFog;
  uniform float uGlow;
  uniform float uDomeGlow;
  uniform vec3 uBase;
  uniform vec3 uBlue;
  uniform vec3 uPink;
  varying vec3 vColor;
  varying float vAlpha;

  float ease(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    int kind = int(aKind + 0.5);
    float delay = aRand * 0.35 + aRank * 0.2;
    float e = smoothstep(delay, delay + 0.45, uGrow[kind]);
    if (e <= 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      vColor = vec3(0.0);
      return;
    }

    float angle = aSpin * uTurn[kind];
    float c = cos(angle);
    float s = sin(angle);
    vec3 target = aPivot + vec3(aLocal.x * c - aLocal.z * s, aLocal.y, aLocal.x * s + aLocal.z * c);
    target += 0.012 * vec3(sin(uTime * 1.7 + aRand * 40.0), cos(uTime * 1.3 + aRand * 30.0), 0.0);

    float ee = ease(e);
    vec3 p = mix(position, target, ee);
    p.y += sin(3.14159 * ee) * (0.35 + aRand * 0.5);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    bool dome = kind == ${DOME};
    float isBeam = step(0.0005, aBeam);
    float pulse = smoothstep(0.82, 1.0, fract(aBeam * 3.0 - uTime * 4.0 + aLocal.y * 6.0)) * isBeam;
    float h = clamp(aLocal.y / uDomeR, 0.0, 1.0);
    float band = exp(-abs(h - fract(uTime * 0.18 + aPivot.x * 0.05)) * 14.0);

    float size = 1.0 + aRand * 0.3 + pulse * 0.9;
    if (dome) size = (0.8 + aRand * 0.4 + band * 0.8) * mix(1.0, 1.25, step(1.01, uDomeGlow));
    gl_PointSize = min(uSize * uPixelRatio * size * (20.0 / -mv.z), 5.0 * uPixelRatio);

    vec3 col = mix(uBlue, uPink, smoothstep(-0.2, 2.4, aLocal.y + (aRand - 0.5) * 0.8));
    col = mix(uBase, col, 0.55);
    col = mix(col, mix(uPink, vec3(1.0), pulse * 0.7), isBeam);
    if (dome) col = mix(mix(uBlue, uPink, h * 0.8 + band * 0.3), vec3(1.0), band * 0.25);
    vColor = mix(uBase, col, ee);

    float lit = mix(0.5 + aRand * 0.35, (0.14 + pulse * 1.5) * (1.0 - aBeam * 0.55), isBeam);
    if (dome) lit = (0.3 + aRand * 0.2 + band * 0.8) * (0.7 + (1.0 - h) * 0.5) * uDomeGlow;
    vAlpha = lit * uGlow * smoothstep(0.0, 0.3, ee) * smoothstep(uFog, 10.0, -mv.z);
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

/*
 * Each lane is a quadratic curve lifted above both ends: dim "wire" points draw the arc as it extends,
 * packets run along it in clumps. Lanes start one after another as uFlow goes from 0 to 1.
 */
const STREAM_VERT = /* glsl */ `
  attribute vec3 aFrom;
  attribute float aLift;
  attribute float aT;
  attribute float aWire;
  attribute float aLane;
  uniform vec3 uTo;
  uniform float uFlow;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uBlue;
  uniform vec3 uPink;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float reach = clamp(uFlow * 1.6 - aLane * 0.6, 0.0, 1.0);
    float t = aWire > 0.5 ? aT * reach : fract(aT + uTime * (0.32 + aLane * 0.1));
    float on = aWire > 0.5 ? step(0.001, reach) : step(t, reach) * step(0.001, reach);
    vec3 ctrl = mix(aFrom, uTo, 0.5);
    ctrl.y = max(aFrom.y, uTo.y) + aLift;
    vec3 a = mix(aFrom, ctrl, t);
    vec3 b = mix(ctrl, uTo, t);
    vec3 p = mix(a, b, t);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = aWire > 0.5 ? 1.0 : 1.8 + fract(aT * 17.0) * 0.9;
    gl_PointSize = min(uSize * uPixelRatio * size * (20.0 / -mv.z), 6.0 * uPixelRatio) * on;
    float fade = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.86, 1.0, t));
    vColor = mix(uPink, mix(uBlue, vec3(1.0), 0.3), t);
    vAlpha = on * fade * (aWire > 0.5 ? 0.6 : 1.0);
  }
`;

export const hash = (i: number) => {
  const s = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return s - Math.floor(s);
};
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (t: number) => {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Common {
  scene: Scene;
  high: boolean;
  pixelRatio: number;
  colors: { base: Color; blue: Color; pink: Color };
}

interface SiteOptions extends Common {
  at: { x: number; z: number };
  /* Direction (radians, in the xz plane) from the site towards the camera; devices face it. */
  face: number;
  scale?: number;
  /* 'full' for the hero site, 'lite' for distant satellites. */
  detail?: 'full' | 'lite';
  /* The terrain levels into a pad under this site, so points start and stand on the pad height. */
  pad?: boolean;
  seed?: number;
  /* Distance at which points have faded out completely. */
  fog?: number;
  /* Extra brightness for the dome shell only. */
  domeGlow?: number;
}

export function createSite(o: SiteOptions) {
  const scale = o.scale ?? 1;
  const lite = o.detail === 'lite';
  const seed = o.seed ?? 0;
  const domeR = DOME_R * scale;
  const padR = PAD_R * scale;
  const centre = new Vector3(o.at.x, terrainHeight(o.at.x, o.at.z), o.at.z);

  const groundAt = (x: number, z: number) => {
    if (!o.pad) return terrainHeight(x, z);
    const d = Math.hypot(x - centre.x, z - centre.z);
    const pad = 1 - smooth((d - padR * 0.55) / (padR * 0.45));
    return lerp(terrainHeight(x, z), centre.y, pad);
  };

  const k = o.high ? 1 : 0.58;
  const perDevice = Math.round((lite ? 520 : 2600) * k);
  const domeCount = Math.round((lite ? 3200 : 7000) * k);
  const total = perDevice * DEVICE_ORDER.length + domeCount;

  const position = new Float32Array(total * 3);
  const local = new Float32Array(total * 3);
  const pivot = new Float32Array(total * 3);
  const kind = new Float32Array(total);
  const spin = new Float32Array(total);
  const beam = new Float32Array(total);
  const rand = new Float32Array(total);
  const rank = new Float32Array(total);
  let n = 0;
  const h = (i: number) => hash(i + seed * 7919);

  function addShape(id: ShapeId, kindId: number, count: number, at: Vector3, s: number, shapeSeed: number) {
    const cloud = buildShape(id, count, shapeSeed);
    const c = Math.cos(o.face);
    const sn = Math.sin(o.face);
    for (let i = 0; i < count; i++) {
      const x = cloud.shape[i * 3] * s;
      const y = (cloud.shape[i * 3 + 1] + 1) * s;
      const z = cloud.shape[i * 3 + 2] * s;
      local.set([x * c - z * sn, y, x * sn + z * c], n * 3);
      pivot.set([at.x, at.y, at.z], n * 3);
      const a = h(n * 3 + 1) * Math.PI * 2;
      const rr = s * 0.9 * Math.sqrt(h(n * 3 + 2));
      const gx = at.x + Math.cos(a) * rr;
      const gz = at.z + Math.sin(a) * rr;
      position.set([gx, groundAt(gx, gz), gz], n * 3);
      kind[n] = kindId;
      spin[n] = cloud.spin[i];
      beam[n] = cloud.beam[i];
      rand[n] = h(n * 3 + 3);
      rank[n] = i / count;
      n++;
    }
  }

  /* Devices on a ring inside the dome, in growth order, starting at the front-left. */
  const spots = DEVICE_ORDER.map((_, i) => {
    const a = o.face + 0.9 + i * ((Math.PI * 2) / DEVICE_ORDER.length);
    const x = centre.x + Math.cos(a) * RING * scale;
    const z = centre.z + Math.sin(a) * RING * scale;
    return new Vector3(x, groundAt(x, z), z);
  });
  DEVICE_ORDER.forEach((id, i) =>
    addShape(id, i, perDevice, spots[i], DEVICE_SCALE * scale, 2000 + i * 131 + seed * 17),
  );

  /* Dome: surface points plus latitude rings and meridians, each rising from the ground right below it. */
  for (let i = 0; i < domeCount; i++, n++) {
    const pick = h(i * 7 + 11);
    let az = h(i * 7 + 12) * Math.PI * 2;
    let el: number;
    if (pick < 0.45) el = Math.asin(h(i * 7 + 13));
    else if (pick < 0.75) el = ((1 + Math.floor(h(i * 7 + 13) * 5)) / 6) * (Math.PI / 2);
    else {
      az = (Math.floor(h(i * 7 + 14) * 16) / 16) * Math.PI * 2;
      el = h(i * 7 + 13) * (Math.PI / 2);
    }
    const x = Math.cos(az) * Math.cos(el) * domeR;
    const y = Math.sin(el) * domeR;
    const z = Math.sin(az) * Math.cos(el) * domeR;
    local.set([x, y, z], n * 3);
    pivot.set([centre.x, centre.y, centre.z], n * 3);
    position.set([centre.x + x, groundAt(centre.x + x, centre.z + z), centre.z + z], n * 3);
    kind[n] = DOME;
    spin[n] = 1;
    beam[n] = 0;
    rand[n] = h(i * 7 + 15);
    rank[n] = el / (Math.PI / 2);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(position, 3));
  geo.setAttribute('aLocal', new BufferAttribute(local, 3));
  geo.setAttribute('aPivot', new BufferAttribute(pivot, 3));
  geo.setAttribute('aKind', new BufferAttribute(kind, 1));
  geo.setAttribute('aSpin', new BufferAttribute(spin, 1));
  geo.setAttribute('aBeam', new BufferAttribute(beam, 1));
  geo.setAttribute('aRand', new BufferAttribute(rand, 1));
  geo.setAttribute('aRank', new BufferAttribute(rank, 1));

  const uniforms = {
    uGrow: { value: new Array<number>(KINDS).fill(0) },
    uTurn: { value: new Array<number>(KINDS).fill(0) },
    uTime: { value: 0 },
    uSize: { value: o.high ? 2.1 : 2.6 },
    uPixelRatio: { value: o.pixelRatio },
    uDomeR: { value: domeR },
    uFog: { value: o.fog ?? 80 },
    uGlow: { value: 1 },
    uDomeGlow: { value: o.domeGlow ?? 1 },
    uOpacity: { value: 1 },
    uBase: { value: o.colors.base },
    uBlue: { value: o.colors.blue },
    uPink: { value: o.colors.pink },
  };
  const points = new Points(
    geo,
    new ShaderMaterial({
      vertexShader: SITE_VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  points.frustumCulled = false;
  points.visible = false;
  o.scene.add(points);

  /* Points on the dome to stream from: high on the shell, spread around the far side. */
  function domeSources(count: number) {
    return Array.from({ length: count }, (_, i) => {
      const az = o.face + Math.PI + (i - (count - 1) / 2) * 0.55;
      const el = 0.75 + (i % 2) * 0.35;
      return new Vector3(
        centre.x + Math.cos(az) * Math.cos(el) * domeR,
        centre.y + Math.sin(el) * domeR,
        centre.z + Math.sin(az) * Math.cos(el) * domeR,
      );
    });
  }

  const deviceTops = spots.map((s) => new Vector3(s.x, s.y + 2.1 * DEVICE_SCALE * scale, s.z));
  const grow = uniforms.uGrow.value;

  /* devices: growth per device (0..1), dome: growth of the dome (0..1). */
  function set(devices: (i: number) => number, dome: number) {
    DEVICE_ORDER.forEach((_, i) => (grow[i] = devices(i)));
    grow[DOME] = dome;
  }

  function update(time: number, opacity: number) {
    const active = opacity > 0.001 && grow.some((g) => g > 0);
    points.visible = active;
    if (!active) return;
    const turn = uniforms.uTurn.value;
    turn[0] = Math.sin(time * 0.55 + seed) * 0.8;
    turn[1] = time * 1.1 + seed;
    turn[3] = time * 0.4;
    turn[4] = time * 2.6;
    turn[DOME] = time * 0.04;
    uniforms.uTime.value = time;
    uniforms.uOpacity.value = opacity;
  }

  const baseSize = uniforms.uSize.value;
  /* Bigger, brighter points for views from far away, where the default look thins out to nothing. */
  function boost(size: number, glow: number) {
    uniforms.uSize.value = baseSize * size;
    uniforms.uGlow.value = glow;
  }

  return { centre, padR, domeR, deviceTops, domeSources, set, update, boost, grow };
}

export type Site = ReturnType<typeof createSite>;

interface StreamOptions extends Common {
  sources: Vector3[];
  perLane?: number;
  /* Point size multiplier, for lanes seen from far away. */
  size?: number;
}

export function createStream(o: StreamOptions) {
  const { sources } = o;
  const perLane = o.perLane ?? (o.high ? 160 : 90);
  const count = sources.length * perLane;
  const from = new Float32Array(count * 3);
  const lift = new Float32Array(count);
  const sT = new Float32Array(count);
  const sWire = new Float32Array(count);
  const sLane = new Float32Array(count);
  sources.forEach((f, lane) => {
    const laneLift = 1.2 + hash(lane + 900) * 1.6;
    for (let j = 0; j < perLane; j++) {
      const i = lane * perLane + j;
      const jitter = 0.08;
      from.set([f.x + (hash(i * 3 + 501) - 0.5) * jitter, f.y, f.z + (hash(i * 3 + 502) - 0.5) * jitter], i * 3);
      lift[i] = laneLift + (hash(i * 3 + 503) - 0.5) * jitter * 3;
      const wire = j < perLane * 0.45;
      sWire[i] = wire ? 1 : 0;
      /* Packets travel in clumps of a few points. */
      sT[i] = wire ? j / (perLane * 0.45) : Math.floor(hash(i + 700) * 5) / 5 + hash(i + 800) * 0.025;
      sLane[i] = sources.length > 1 ? lane / (sources.length - 1) : 0;
    }
  });
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(from.slice(), 3));
  geo.setAttribute('aFrom', new BufferAttribute(from, 3));
  geo.setAttribute('aLift', new BufferAttribute(lift, 1));
  geo.setAttribute('aT', new BufferAttribute(sT, 1));
  geo.setAttribute('aWire', new BufferAttribute(sWire, 1));
  geo.setAttribute('aLane', new BufferAttribute(sLane, 1));
  const uniforms = {
    uTo: { value: new Vector3() },
    uFlow: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: (o.high ? 2.1 : 2.6) * (o.size ?? 1) },
    uPixelRatio: { value: o.pixelRatio },
    uOpacity: { value: 1 },
    uBlue: { value: o.colors.blue },
    uPink: { value: o.colors.pink },
  };
  const points = new Points(
    geo,
    new ShaderMaterial({
      vertexShader: STREAM_VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  points.frustumCulled = false;
  points.visible = false;
  o.scene.add(points);

  const ray = new Vector3();

  /*
   * Puts the target on the camera ray through the centre of an HTML element, `share` of the way from the
   * camera to `anchor`, so the lanes appear to pour into that element.
   */
  function aimAt(el: HTMLElement, camera: PerspectiveCamera, canvas: HTMLCanvasElement, anchor: Vector3, share = 0.6) {
    const c = canvas.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = ((r.left + r.width / 2 - c.left) / c.width) * 2 - 1;
    const y = 1 - ((r.top + r.height / 2 - c.top) / c.height) * 2;
    camera.updateMatrixWorld();
    ray.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
    uniforms.uTo.value.copy(camera.position).addScaledVector(ray, camera.position.distanceTo(anchor) * share);
  }

  function update(flow: number, time: number, opacity: number) {
    points.visible = flow > 0 && opacity > 0.001;
    if (!points.visible) return;
    uniforms.uFlow.value = flow;
    uniforms.uTime.value = time;
    uniforms.uOpacity.value = opacity;
  }

  return { aimAt, update };
}

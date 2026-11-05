import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import { bakedDevice, buildDevices, DEVICE_IDS } from './devices';
import { terrainHeight } from './terrain';

/*
 * Borrows terrain points around a spot and lifts them into shapes.
 * Must match between the terrain shader (which hides borrowed points)
 * and the rise shader (which moves them), so both include it.
 */
export const RISE_GLSL = /* glsl */ `
  uniform vec3 uSpot;
  uniform vec2 uPad;
  uniform float uGrow;

  float riseOf(float rand, float rank, float rise) {
    float delay = rand * 0.4 + rank * 0.2;
    return smoothstep(delay, delay + 0.4, rise);
  }

  /* The ground around the spot levels into a pad (uPad = radius, amount). */
  float padOf(vec2 xz) {
    return (1.0 - smoothstep(uPad.x * 0.55, uPad.x, length(xz - uSpot.xz))) * uPad.y;
  }

  /* On load the ground starts flat and the relief grows from the centre outward. */
  float growOf(vec2 xz) {
    return smoothstep(0.0, 1.0, clamp(uGrow * 1.6 - length(xz) * 0.01, 0.0, 1.0));
  }

  vec3 settle(vec3 p) {
    p.y *= growOf(p.xz);
    p.y = mix(p.y, uSpot.y, padOf(p.xz));
    return p;
  }

  /* Terrain point look, so a device point at rest is indistinguishable from the ground. */
  float groundAlpha(vec3 p, float rand, float z) {
    float contour = smoothstep(0.08, 0.0, abs(fract(p.y * 0.9) - 0.5) - 0.42);
    return smoothstep(70.0, 10.0, z) * smoothstep(4.0, 14.0, z) * (0.32 + rand * 0.4 + contour * 0.45);
  }

  float groundSize(vec3 p) {
    return 1.0 + smoothstep(0.08, 0.0, abs(fract(p.y * 0.9) - 0.5) - 0.42) * 0.4;
  }
`;

const GROW = 1;
const HOLD = 2.2;
const SINK = 0.8;
const CYCLE = GROW + HOLD + SINK;
const PING_EVERY = 5;
/* Relief growth on load (seconds from stage start); devices only rise once the ground is up. */
export const GROW_START = 0.4;
export const GROW_END = 2.6;
/* How the moving head turns: continuous spin (rad/s) or a pan sweep around a heading. Fixed parts face the viewer. */
type Motion = ({ rate: number } | { center: number; amp: number; speed: number }) & { bob?: number };
const MOTION: Partial<Record<(typeof DEVICE_IDS)[number], Motion>> = {
  radar: { rate: 1.1 },
  lidar: { rate: 2.6 },
  camera: { center: Math.PI / 2 + 0.25, amp: 0.85, speed: 0.55 },
  uav: { rate: 0.3, bob: 0.05 },
  interceptor: { rate: 0.3 },
};
const BASE_YAW = 0.6;

/* Point clouds baked from real models (scripts/bake-device.ts) replace the drawn ones. */
const BAKED = import.meta.glob<string>('../../assets/devices/*.bin', { query: '?url', import: 'default' });

const VERT = /* glsl */ `
  attribute vec3 aShape;
  attribute float aSpin;
  attribute float aBeam;
  attribute vec4 aHub;
  attribute float aRand;
  attribute float aRank;
  attribute float aGround;
  uniform float uRise;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform float uRotY;
  uniform float uRotBase;
  uniform float uLift;
  uniform float uScan;
  uniform vec3 uBase;
  uniform vec3 uBlue;
  uniform vec3 uPink;
  varying vec3 vColor;
  varying float vAlpha;

  ${RISE_GLSL}

  float ease(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    float e = riseOf(aRand, aRank, uRise);
    if (e <= 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      vColor = vec3(0.0);
      return;
    }

    vec3 local = aShape + 0.006 * vec3(sin(uTime * 1.7 + aRand * 40.0), cos(uTime * 1.3 + aRand * 30.0), 0.0);
    if (aHub.w != 0.0) {
      float ra = uTime * 16.0 * aHub.w;
      vec2 d = local.xz - aHub.xz;
      local.xz = aHub.xz + vec2(d.x * cos(ra) - d.y * sin(ra), d.x * sin(ra) + d.y * cos(ra));
    }
    float angle = mix(uRotBase, uRotY, aSpin);
    float c = cos(angle);
    float s = sin(angle);
    vec3 target = uSpot + vec3(local.x * c - local.z * s, local.y + 1.0 + uLift * aSpin, local.x * s + local.z * c) * uScale;

    vec3 rest = settle(position);
    float ee = ease(e);
    vec3 p = mix(rest, target, ee);
    p.y += sin(3.14159 * ee) * uScale * 0.2 * (0.3 + aRand);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float isBeam = step(0.0005, aBeam);
    /* Laser pulses travelling outward along each beam. */
    float pulse = smoothstep(0.82, 1.0, fract(aBeam * 3.0 - uTime * 4.0 + aShape.y * 6.0)) * isBeam;
    float scan = exp(-abs(local.y - uScan) * 9.0) * ee * (1.0 - isBeam);
    float size = mix(groundSize(rest), 1.0 + aRand * 0.3 + scan * 0.5 + pulse * 0.9, ee);
    gl_PointSize = min(uSize * uPixelRatio * size * (20.0 / -mv.z), 5.0 * uPixelRatio);

    vec3 col = mix(uBlue, uPink, smoothstep(-0.6, 1.3, local.y + (aRand - 0.5) * 0.6));
    col = mix(uBase, col, 0.55 + scan * 0.3);
    col = mix(col, mix(uPink, vec3(1.0), pulse * 0.7), isBeam);
    vColor = mix(uBase, col, ee);
    float lit = mix(0.5 + aRand * 0.35 + scan * 0.35, (0.14 + pulse * 1.5) * (1.0 - aBeam * 0.55), isBeam);
    vAlpha = mix(groundAlpha(rest, aRand, -mv.z), lit, ee);
    vAlpha *= mix(smoothstep(0.0, 0.35, ee), 1.0, aGround);
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

const hash = (i: number) => {
  const s = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return s - Math.floor(s);
};

interface RiseOptions {
  scene: Scene;
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  high: boolean;
  pixelRatio: number;
  terrain: { positions: Float32Array; randoms: Float32Array; hole: BufferAttribute };
  terrainUniforms: {
    uRise: { value: number };
    uPingCenter: { value: Vector2 };
    uPingAge: { value: Vector2 };
    uSpot: { value: Vector3 };
    uPad: { value: Vector2 };
    uLidar: { value: Vector3 };
    uView: { value: Vector4 };
    uGrow: { value: number };
  };
  heroView: { cam: [number, number, number]; look: [number, number, number] };
  colors: { base: Color; blue: Color; pink: Color };
}

export function createRiseLayer(o: RiseOptions) {
  const anchor = document.querySelector<HTMLElement>('[data-hero-device]');
  const chapter = anchor?.closest<HTMLElement>('[data-chapter]');
  if (!anchor || !chapter) return null;

  const count = o.high ? 5000 : 2800;
  const shapes = buildDevices(count);
  const forced = Number(new URLSearchParams(location.search).get('device'));
  const hold = Number.isInteger(forced) && forced >= 1 && forced <= shapes.length ? forced - 1 : -1;

  const start = new BufferAttribute(new Float32Array(count * 3), 3);
  const shape = new BufferAttribute(new Float32Array(count * 3), 3);
  const spin = new BufferAttribute(new Float32Array(count), 1);
  const beam = new BufferAttribute(new Float32Array(count), 1);
  const hub = new BufferAttribute(new Float32Array(count * 4), 4);
  const rand = new BufferAttribute(new Float32Array(count), 1);
  const rank = new BufferAttribute(new Float32Array(count), 1);
  const ground = new BufferAttribute(new Float32Array(count), 1);
  const geo = new BufferGeometry();
  geo.setAttribute('aGround', ground);
  geo.setAttribute('position', start);
  geo.setAttribute('aShape', shape);
  geo.setAttribute('aSpin', spin);
  geo.setAttribute('aBeam', beam);
  geo.setAttribute('aHub', hub);
  geo.setAttribute('aRand', rand);
  geo.setAttribute('aRank', rank);

  const uniforms = {
    uRise: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: o.high ? 2.1 : 2.6 },
    uPixelRatio: { value: o.pixelRatio },
    uScale: { value: 3 },
    uRotY: { value: 0 },
    uRotBase: { value: BASE_YAW },
    uLift: { value: 0 },
    uScan: { value: -1 },
    uOpacity: { value: 1 },
    uSpot: o.terrainUniforms.uSpot,
    uPad: o.terrainUniforms.uPad,
    uGrow: o.terrainUniforms.uGrow,
    uBase: { value: o.colors.base },
    uBlue: { value: o.colors.blue },
    uPink: { value: o.colors.pink },
  };
  const points = new Points(
    geo,
    new ShaderMaterial({
      vertexShader: VERT,
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

  /*
   * Only the ground under the device feeds it: every terrain point inside the footprint is lifted,
   * and the rest of the device emerges from that same patch, hidden while at rest.
   */
  function borrow(cx: number, cz: number) {
    const { positions, randoms, hole } = o.terrain;
    const n = randoms.length;
    const radius = uniforms.uScale.value * 0.9;
    const near: { i: number; d: number }[] = [];
    for (let i = 0; i < n; i++) {
      const dx = positions[i * 3] - cx;
      const dz = positions[i * 3 + 2] - cz;
      const d = dx * dx + dz * dz;
      if (d < radius * radius) near.push({ i, d });
    }
    near.sort((a, b) => a.d - b.d);
    const real = near.slice(0, count);

    (hole.array as Float32Array).fill(0);
    const last = Math.max(1, count - 1);
    real.forEach(({ i }, k) => {
      (hole.array as Float32Array)[i] = 1 + k / last;
      start.array[k * 3] = positions[i * 3];
      start.array[k * 3 + 1] = positions[i * 3 + 1];
      start.array[k * 3 + 2] = positions[i * 3 + 2];
      rand.array[k] = randoms[i];
      rank.array[k] = k / last;
      ground.array[k] = 1;
    });
    for (let k = real.length; k < count; k++) {
      const a = hash(k * 3 + 1) * Math.PI * 2;
      const rr = radius * Math.sqrt(hash(k * 3 + 2));
      const x = cx + Math.cos(a) * rr;
      const z = cz + Math.sin(a) * rr;
      start.array[k * 3] = x;
      start.array[k * 3 + 1] = terrainHeight(x, z);
      start.array[k * 3 + 2] = z;
      rand.array[k] = hash(k * 3 + 3);
      rank.array[k] = k / last;
      ground.array[k] = 0;
    }
    hole.needsUpdate = true;
    start.needsUpdate = true;
    rand.needsUpdate = true;
    rank.needsUpdate = true;
    ground.needsUpdate = true;
  }

  /* Project the DOM anchor through the hero camera onto the terrain. */
  const probe = new PerspectiveCamera();
  let padRadius = 4;
  function layout() {
    const canvas = o.canvas.getBoundingClientRect();
    const rect = anchor!.getBoundingClientRect();
    const top = rect.top - chapter!.getBoundingClientRect().top;
    if (rect.width < 10 || canvas.height < 10) return;

    probe.fov = o.camera.fov;
    probe.aspect = o.camera.aspect;
    probe.near = 0.1;
    probe.far = 200;
    probe.position.set(...o.heroView.cam);
    probe.lookAt(...o.heroView.look);
    probe.updateProjectionMatrix();
    probe.updateMatrixWorld();

    const sx = rect.left + rect.width / 2 - canvas.left;
    const sy = top + rect.height * 0.9;
    const dir = new Vector3((sx / canvas.width) * 2 - 1, -(sy / canvas.height) * 2 + 1, 0.5)
      .unproject(probe)
      .sub(probe.position)
      .normalize();
    if (dir.y > -0.02) dir.y = -0.02;

    let ground = 0;
    let hit = new Vector3();
    for (let k = 0; k < 3; k++) {
      const t = (ground - probe.position.y) / dir.y;
      hit = probe.position.clone().addScaledVector(dir, t);
      hit.x = Math.max(-28, Math.min(28, hit.x));
      hit.z = Math.max(-28, Math.min(28, hit.z));
      ground = terrainHeight(hit.x, hit.z);
    }
    hit.y = ground;

    const dist = hit.distanceTo(probe.position);
    const worldPerPx = (2 * dist * Math.tan((probe.fov * Math.PI) / 360)) / canvas.height;
    uniforms.uScale.value = rect.height * (probe.aspect < 1 ? 0.4 : 0.3) * worldPerPx;
    o.terrainUniforms.uSpot.value.copy(hit);
    o.terrainUniforms.uPingCenter.value.set(hit.x, hit.z);
    padRadius = uniforms.uScale.value * 1.3;
    borrow(hit.x, hit.z);
  }

  let timer = 0;
  function relayout(now = false) {
    clearTimeout(timer);
    if (now) layout();
    else timer = window.setTimeout(layout, 150);
  }

  const names = Array.from(anchor.querySelectorAll<HTMLElement>('[data-device-name]'));
  const indexEl = anchor.querySelector<HTMLElement>('[data-device-index]');
  const bar = anchor.querySelector<HTMLElement>('[data-device-bar]');
  const labelEl = anchor.querySelector<HTMLElement>('.prologue__label');
  const total = String(DEVICE_IDS.length).padStart(2, '0');

  let current = hold >= 0 ? hold : 0;
  let shown = -1;
  let clock = 0;
  let intro = 0;
  const pings = [-10, -10];

  function setShape(i: number) {
    shape.array.set(shapes[i].shape);
    spin.array.set(shapes[i].spin);
    beam.array.set(shapes[i].beam);
    hub.array.set(shapes[i].hub);
    shape.needsUpdate = true;
    spin.needsUpdate = true;
    beam.needsUpdate = true;
    hub.needsUpdate = true;
  }

  DEVICE_IDS.forEach((id, i) => {
    const load = BAKED[`../../assets/devices/${id}.bin`];
    if (!load) return;
    load()
      .then((url) => fetch(url))
      .then((res) => res.arrayBuffer())
      .then((buf) => {
        shapes[i] = bakedDevice(new Float32Array(buf), count);
        if (i === current) setShape(i);
      })
      .catch(() => {});
  });

  function label(i: number) {
    if (i === shown) return;
    shown = i;
    names.forEach((el, k) => el.classList.toggle('is-on', k === i));
    if (indexEl) indexEl.textContent = `${String(i + 1).padStart(2, '0')} / ${total}`;
  }

  setShape(current);
  label(current);

  const smooth = (t: number) => t * t * (3 - 2 * t);
  let cycleClock = 0;

  function update(dt: number, time: number, opacity: number) {
    const before = clock;
    clock += dt;
    if (Math.floor(clock / PING_EVERY) !== Math.floor(before / PING_EVERY)) {
      pings[1] = pings[0];
      pings[0] = clock;
    }

    if (time > GROW_END) {
      if (intro === 0) labelEl?.classList.add('is-shown');
      intro = Math.min(1, intro + dt / 2.2);
    }
    const p = parseFloat(chapter!.style.getPropertyValue('--p')) || 0;
    const onStage = (1 - Math.pow(1 - intro, 3)) * Math.max(0, 1 - p * 1.6);

    /* Each device grows out of the ground, holds, then melts back into a level pad before the next one. */
    let presence = 1;
    if (hold < 0 && intro >= 1) {
      cycleClock += dt;
      if (cycleClock >= CYCLE) {
        cycleClock %= CYCLE;
        current = (current + 1) % shapes.length;
        setShape(current);
        label(current);
      }
      const t = cycleClock;
      presence = t < GROW ? smooth(t / GROW) : t < GROW + HOLD ? 1 : 1 - smooth((t - GROW - HOLD) / SINK);
      bar?.style.setProperty('--bar', (t / CYCLE).toFixed(3));
    } else if (hold < 0) {
      cycleClock = GROW;
    }

    const rise = onStage * presence;
    uniforms.uRise.value = rise;
    o.terrainUniforms.uRise.value = rise;
    o.terrainUniforms.uPad.value.set(padRadius, onStage * (0.4 + 0.6 * (1 - presence)));
    o.terrainUniforms.uPingAge.value.set(clock - pings[0], clock - pings[1]);
    const id = DEVICE_IDS[current];
    const lidar = o.terrainUniforms.uLidar.value;
    const view = o.terrainUniforms.uView.value;
    lidar.y = id === 'lidar' ? rise : 0;
    view.y = id === 'camera' ? rise : 0;
    points.visible = rise > 0.001;
    if (!points.visible) return;

    uniforms.uTime.value = time;
    const motion = MOTION[id];
    if (!motion) {
      uniforms.uRotBase.value = BASE_YAW + time * 0.25;
      uniforms.uRotY.value = uniforms.uRotBase.value;
    } else if ('rate' in motion) {
      uniforms.uRotBase.value = BASE_YAW;
      uniforms.uRotY.value += dt * motion.rate;
    } else {
      uniforms.uRotBase.value = BASE_YAW;
      uniforms.uRotY.value = motion.center + Math.sin(time * motion.speed) * motion.amp;
    }
    uniforms.uLift.value = motion?.bob ? Math.sin(time * 1.7) * motion.bob + Math.sin(time * 0.6) * motion.bob * 0.5 : 0;
    const range = uniforms.uScale.value * 6;
    lidar.x = uniforms.uRotY.value;
    lidar.z = range;
    view.x = uniforms.uRotY.value;
    view.z = range * (0.15 + ((time * 0.35) % 1) * 0.85);
    view.w = range;
    uniforms.uScan.value = -1.2 + ((time * 0.45) % 1) * 2.6;
    uniforms.uOpacity.value = opacity;
  }

  return { update, relayout };
}

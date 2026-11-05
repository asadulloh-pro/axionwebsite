import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
} from 'three';
import { createCloud } from './flight';
import { clamp01, smooth } from './sites';
import { terrainHeight } from './terrain';

/*
 * The Nexus border scenario of the home projects chapter ([data-nexus]), driven by the chapter's scroll
 * progress: a border is drawn across the relief, cameras and a belt of buried vibration sensors come online,
 * three intruders walk in from the far side, the vibration sensors feel their steps, a camera sees and
 * classifies them, and when they cross the border that stretch turns red and an alert is raised.
 * HTML callouts in the chapter follow the scene on screen. Scrolling back plays it in reverse.
 */

/* Chapter progress of each beat. */
const DRAW = [0.02, 0.15];
const SENSORS = [0.12, 0.25];
const WALK = [0.25, 0.75];
const VIB_AT = 0.42;
const CAM_AT = 0.55;
const CROSS_AT = 0.66;

/* Border across the relief, west to east; the far (foreign) side is -z. */
const BORDER_XZ: [number, number][] = [
  [-17, -3],
  [-9, -0.5],
  [-1, -2.8],
  [7, -1.2],
  [17, -3.4],
];
const BELT_OFFSET = 6.2;
const CAMERA_X = [-3.5, 5.6, 12];
const BREACH_X = 3;
const PEOPLE = [
  { dx: -0.9, lag: 0 },
  { dx: 0.5, lag: 0.03 },
  { dx: 1.6, lag: 0.06 },
];

const GROUND_VERT = /* glsl */ `
  attribute float aKind;
  attribute float aT;
  attribute float aRand;
  attribute float aIdx;
  attribute float aD;
  uniform float uTime;
  uniform float uDraw;
  uniform float uSensors;
  uniform float uVib;
  uniform vec3 uVibAt;
  uniform float uCamHit;
  uniform float uCamAlert;
  uniform float uDanger;
  uniform float uBreachT;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uFog;
  uniform vec3 uBlue;
  uniform vec3 uCyan;
  uniform vec3 uRed;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float alpha = 0.0;
    float size = 1.0 + aRand * 0.3;
    vec3 col = uCyan;
    float flash = 0.55 + 0.45 * sin(uTime * 9.0);

    if (aKind < 0.5) {
      /* Border line, drawn west to east; the breached stretch flashes red. */
      alpha = step(aT, uDraw) * (0.55 + aRand * 0.45);
      float hot = uDanger * (1.0 - smoothstep(0.04, 0.09, abs(aT - uBreachT)));
      col = mix(uCyan, uRed, hot);
      alpha *= mix(1.0, flash * 1.6, hot);
      size *= 1.2 + hot * 0.6;
    } else if (aKind < 1.5) {
      /* Border posts. */
      alpha = step(aT, uDraw) * 0.7;
      col = mix(uBlue, uCyan, 0.4);
    } else if (aKind < 2.5) {
      /* Buried sensor cable, faint. */
      alpha = step(aT, uSensors) * 0.5;
      col = uBlue;
    } else if (aKind < 3.5) {
      /* Vibration sensor nodes; the one that feels the steps turns red. */
      float hit = uVib * (1.0 - step(0.6, distance(p.xz, uVibAt.xz)));
      alpha = step(aT, uSensors) * (1.1 + hit * flash);
      col = mix(uCyan, uRed, hit);
      size *= 1.8 + hit * 1.2;
    } else if (aKind < 4.5) {
      /* Ripples spreading from that node. */
      float r = fract(uTime * 0.6 + aIdx * 0.5) * 3.2;
      float e = (aD - r) / 0.18;
      alpha = uVib * exp(-e * e) * (1.0 - r / 3.2) * 1.4;
      size *= 1.5;
      col = uRed;
    } else {
      /* Camera fields of view on the ground, with a sweeping band; the camera that sees them turns red. */
      float sweep = sin(uTime * 0.8 + aIdx * 2.1) * 0.65;
      float e = (aT - sweep) / 0.22;
      float band = exp(-e * e);
      float hot = uCamAlert * (1.0 - step(0.5, abs(aIdx - uCamHit)));
      alpha = uSensors * (0.14 + band * 0.45 + hot * 0.3) * (1.0 - aD * 0.5);
      size *= 1.3;
      col = mix(mix(uBlue, uCyan, 0.5), uRed, hot);
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * uPixelRatio * size * (20.0 / -mv.z), 5.0 * uPixelRatio);
    vColor = col;
    vAlpha = alpha * smoothstep(uFog, 10.0, -mv.z);
  }
`;

const GROUND_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    gl_FragColor = vec4(vColor, smoothstep(0.5, 0.05, r) * vAlpha * uOpacity);
  }
`;

interface NexusLayerOptions {
  scene: Scene;
  camera: PerspectiveCamera;
  high: boolean;
  pixelRatio: number;
  colors: { base: Color; blue: Color; pink: Color };
}

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

const onGround = (x: number, z: number, lift = 0.06) => new Vector3(x, terrainHeight(x, z) + lift, z);

export function createNexusLayer(o: NexusLayerOptions) {
  const found = document.querySelector<HTMLElement>('[data-nexus]');
  if (!found) return null;
  const chapter: HTMLElement = found;
  const q = <T extends Element>(sel: string) => chapter.querySelector<T>(sel);
  const layer = q<HTMLElement>('.nx-layer');
  const borderTag = q<HTMLElement>('[data-nx-border]');
  const vibTag = q<HTMLElement>('[data-nx-vib]');
  const camTag = q<HTMLElement>('[data-nx-cam]');
  const frameEl = q<HTMLElement>('[data-nx-frame]');
  const alertEl = q<HTMLElement>('[data-nx-alert]');
  const sight = q<SVGLineElement>('[data-nx-sight]');

  const r = rng(424);
  const k = o.high ? 1 : 0.6;
  const border = new CatmullRomCurve3(BORDER_XZ.map(([x, z]) => new Vector3(x, 0, z)));
  const borderAtX = (x: number) => {
    let best = 0;
    let dist = Infinity;
    for (let i = 0; i <= 400; i++) {
      const d = Math.abs(border.getPoint(i / 400).x - x);
      if (d < dist) {
        dist = d;
        best = i / 400;
      }
    }
    return best;
  };
  const flat = new Vector3();
  const borderPoint = (t: number, dz = 0, lift = 0.06) => {
    border.getPoint(t, flat);
    return onGround(flat.x, flat.z + dz, lift);
  };

  /* Ground marks: one cloud, the kind of each point picks its look in the shader. */
  const pos: number[] = [];
  const kind: number[] = [];
  const tAttr: number[] = [];
  const rand: number[] = [];
  const idx: number[] = [];
  const dAttr: number[] = [];
  const push = (p: Vector3, kd: number, t: number, i = 0, d = 0) => {
    pos.push(p.x, p.y, p.z);
    kind.push(kd);
    tAttr.push(t);
    rand.push(r());
    idx.push(i);
    dAttr.push(d);
  };

  for (let i = 0; i < 1100 * k; i++) {
    const t = r();
    push(borderPoint(t, (r() - 0.5) * 0.12), 0, t);
  }
  for (let post = 0; post <= 26; post++) {
    const t = post / 26;
    const base = borderPoint(t, 0, 0);
    for (let i = 0; i < 26 * k; i++) push(base.clone().add(new Vector3(0, r() * 0.9, 0)), 1, t);
  }
  for (let i = 0; i < 1000 * k; i++) {
    const t = r();
    push(borderPoint(t, -BELT_OFFSET, 0.04), 2, t);
  }
  const nodes: Vector3[] = [];
  for (let n = 0; n <= 14; n++) {
    const t = 0.02 + (n / 14) * 0.96;
    const c = borderPoint(t, -BELT_OFFSET, 0.08);
    nodes.push(c);
    for (let i = 0; i < 40 * k; i++) {
      const a = r() * Math.PI * 2;
      const rr = r() * 0.16;
      push(onGround(c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr, 0.1), 3, t);
    }
  }

  const breachT = borderAtX(BREACH_X);
  const breach = borderPoint(breachT);
  const vibNode = nodes.reduce((a, b) => (Math.abs(b.x - BREACH_X) < Math.abs(a.x - BREACH_X) ? b : a));
  for (let i = 0; i < 2600 * k; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 3.2;
    push(onGround(vibNode.x + Math.cos(a) * d, vibNode.z + Math.sin(a) * d, 0.08), 4, 0, i % 2, d);
  }

  const cams = CAMERA_X.map((x) => {
    const t = borderAtX(x);
    border.getPoint(t, flat);
    return { t, at: onGround(flat.x, flat.z + 0.7, 0) };
  });
  cams.forEach((cam, c) => {
    for (let i = 0; i < 1500 * k; i++) {
      const s = r() * 2 - 1;
      const d = Math.sqrt(r());
      const ang = -Math.PI / 2 + s * 0.55;
      const dist = 1 + d * 6;
      push(onGround(cam.at.x + Math.cos(ang) * dist, cam.at.z + Math.sin(ang) * dist, 0.07), 5, s, c, d);
    }
  });

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('aKind', new BufferAttribute(new Float32Array(kind), 1));
  g.setAttribute('aT', new BufferAttribute(new Float32Array(tAttr), 1));
  g.setAttribute('aRand', new BufferAttribute(new Float32Array(rand), 1));
  g.setAttribute('aIdx', new BufferAttribute(new Float32Array(idx), 1));
  g.setAttribute('aD', new BufferAttribute(new Float32Array(dAttr), 1));
  const red = new Color('#ff4f7a');
  const uniforms = {
    uTime: { value: 0 },
    uDraw: { value: 0 },
    uSensors: { value: 0 },
    uVib: { value: 0 },
    uVibAt: { value: vibNode.clone() },
    uCamHit: { value: 1 },
    uCamAlert: { value: 0 },
    uDanger: { value: 0 },
    uBreachT: { value: breachT },
    uSize: { value: 2.6 },
    uPixelRatio: { value: o.pixelRatio },
    uFog: { value: 90 },
    uOpacity: { value: 1 },
    uBlue: { value: o.colors.blue },
    uCyan: { value: new Color('#5fd4ff') },
    uRed: { value: red },
  };
  const ground = new Points(
    g,
    new ShaderMaterial({
      vertexShader: GROUND_VERT,
      fragmentShader: GROUND_FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  ground.frustumCulled = false;
  o.scene.add(ground);

  const cameraClouds = cams.map((cam, c) => {
    const cloud = createCloud({
      scene: o.scene,
      shape: 'camera',
      count: o.high ? 1100 : 600,
      scale: 0.55,
      pixelRatio: o.pixelRatio,
      colors: { base: o.colors.base, a: o.colors.blue, b: o.colors.pink },
      size: 1.6,
      seed: 20 + c,
    });
    cloud.place(cam.at.clone().add(new Vector3(0, 0.55, 0)));
    return cloud;
  });

  /* Intruders walk in a loose file from the far side, straight across the breach point. */
  const start = new Vector3(BREACH_X, 0, -14);
  const end = new Vector3(BREACH_X, 0, 0.5);
  const heading = end.clone().sub(start).normalize();
  const side = new Vector3(-heading.z, 0, heading.x);
  const calm = { base: new Color('#f3eee8'), a: new Color('#d8d2ca'), b: new Color('#b9b2aa') };
  const alarm = { base: new Color('#ffd0dc'), a: red, b: new Color('#ff8a5c') };
  const people = PEOPLE.map((m, i) => ({
    ...m,
    at: new Vector3(),
    cloud: createCloud({
      scene: o.scene,
      shape: 'person',
      count: o.high ? 700 : 420,
      scale: 0.75,
      pixelRatio: o.pixelRatio,
      colors: { base: calm.base.clone(), a: calm.a.clone(), b: calm.b.clone() },
      size: 1.7,
      seed: 40 + i,
    }),
  }));
  const groupAt = new Vector3();

  const frame = () => (chapter.parentElement?.classList.contains('pin-spacer') ? chapter.parentElement : chapter);
  const v = new Vector3();
  let rect = chapter.getBoundingClientRect();
  const toScreen = (at: Vector3) => {
    v.copy(at).project(o.camera);
    return { x: (v.x + 1) * 0.5 * window.innerWidth - rect.left, y: (1 - v.y) * 0.5 * window.innerHeight - rect.top };
  };
  const moveTo = (el: HTMLElement | null, at: { x: number; y: number }, on: number) => {
    if (!el) return;
    el.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px)`;
    el.style.opacity = on.toFixed(3);
    el.dataset.side = at.x > rect.width - 190 ? 'left' : 'right';
  };
  const window01 = (p: number, a: number, b: number, fade = 0.03) => smooth((p - a) / fade) * (1 - smooth((p - b) / fade));
  const camTop = cams[1].at.clone().add(new Vector3(0, 0.6, 0));
  const vibAbove = vibNode.clone().add(new Vector3(0, 0.2, 0));
  const borderLabelAt = borderPoint(0.66, 0, 1.1);

  function updatePeople(time: number, p: number, opacity: number) {
    const alert = smooth((p - CAM_AT) / 0.04);
    groupAt.set(0, 0, 0);
    people.forEach((person, i) => {
      const w = clamp01((p - WALK[0] - person.lag) / (WALK[1] - WALK[0]));
      const x = start.x + (end.x - start.x) * w + side.x * person.dx;
      const z = start.z + (end.z - start.z) * w + side.z * person.dx;
      const moving = w > 0 && w < 1 ? 1 : 0;
      const bob = Math.abs(Math.sin(time * 6 + i * 1.7)) * 0.05 * moving;
      person.at.set(x, terrainHeight(x, z) + bob, z);
      person.cloud.place(person.at, heading, 'x');
      const u = person.cloud.uniforms;
      u.uBase.value.copy(calm.base).lerp(alarm.base, alert);
      u.uColorA.value.copy(calm.a).lerp(alarm.a, alert);
      u.uColorB.value.copy(calm.b).lerp(alarm.b, alert);
      person.cloud.update(time, smooth((p - WALK[0] + 0.06) / 0.06), 0, opacity);
      groupAt.add(person.at);
    });
    groupAt.multiplyScalar(1 / people.length).add(new Vector3(0, 0.6, 0));
  }

  function updateOverlays(p: number, vis: number) {
    if (!layer) return;
    const pinned = chapter.classList.contains('is-pinned');
    layer.style.opacity = (pinned ? vis : 0).toFixed(3);
    if (!pinned || vis < 0.001) return;

    o.camera.updateMatrixWorld();
    rect = chapter.getBoundingClientRect();
    moveTo(borderTag, toScreen(borderLabelAt), window01(p, 0.1, 0.4));
    moveTo(vibTag, toScreen(vibAbove), window01(p, VIB_AT, 0.95));
    const cam = toScreen(camTop);
    moveTo(camTag, cam, window01(p, CAM_AT, 0.95));

    const group = toScreen(groupAt);
    const dist = o.camera.position.distanceTo(groupAt);
    const px = window.innerHeight / (2 * Math.tan((o.camera.fov * Math.PI) / 360));
    const size = Math.max(54, (4.2 / dist) * px);
    moveTo(frameEl, group, window01(p, CAM_AT, 0.97));
    frameEl?.style.setProperty('--size', `${size.toFixed(1)}px`);

    if (sight) {
      sight.setAttribute('x1', cam.x.toFixed(1));
      sight.setAttribute('y1', cam.y.toFixed(1));
      sight.setAttribute('x2', group.x.toFixed(1));
      sight.setAttribute('y2', group.y.toFixed(1));
      sight.style.opacity = window01(p, CAM_AT, 0.95).toFixed(3);
    }
    moveTo(alertEl, toScreen(breach), smooth((p - CROSS_AT) / 0.04));
  }

  function update(time: number, opacity: number) {
    const vh = window.innerHeight;
    const box = frame().getBoundingClientRect();
    const p = parseFloat(chapter.style.getPropertyValue('--p')) || 0;
    const vis = clamp01((vh - box.top) / (vh * 0.6)) * clamp01((box.bottom - vh * 0.45) / (vh * 0.4));
    const shown = opacity * vis;

    uniforms.uTime.value = time;
    uniforms.uDraw.value = clamp01((p - DRAW[0]) / (DRAW[1] - DRAW[0]));
    uniforms.uSensors.value = clamp01((p - SENSORS[0]) / (SENSORS[1] - SENSORS[0]));
    uniforms.uVib.value = smooth((p - VIB_AT) / 0.03);
    uniforms.uCamAlert.value = smooth((p - CAM_AT) / 0.03);
    uniforms.uDanger.value = smooth((p - CROSS_AT) / 0.03);
    uniforms.uOpacity.value = shown;
    ground.visible = shown > 0.001;

    const camsOn = smooth((p - SENSORS[0]) / (SENSORS[1] - SENSORS[0]));
    cameraClouds.forEach((cloud) => cloud.update(time, camsOn, 0, shown));
    updatePeople(time, p, shown);
    updateOverlays(p, shown);
  }

  return { update };
}

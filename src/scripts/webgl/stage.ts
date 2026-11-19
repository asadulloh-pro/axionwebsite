import { Color, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { createRiseLayer, GROW_END, GROW_START } from './rise-layer';
import { createTerrainPoints, easeInOutCubic } from './terrain-points';
import { createSiteLayer } from './site-layer';
import { createInterceptLayer } from './intercept-layer';
import { createNexusLayer } from './nexus-layer';

export interface StageOptions {
  tier: 'high' | 'low';
}

interface Keyframe {
  cam: [number, number, number];
  look: [number, number, number];
  opacity: number;
  ping: number;
  /* Chapter-local progress at which the camera starts moving on to the next keyframe. */
  leave?: number;
}

/* One keyframe per story chapter, in DOM order. */
const KEYFRAMES: Keyframe[] = [
  { cam: [0, 8, 25], look: [0, -1.5, 2], opacity: 1, ping: 1 },
  { cam: [-9, 5.5, 20], look: [-1.6, -3.4, 2.3], opacity: 0.6, ping: 0, leave: 0.86 },
  // { cam: [-16, 6, 26], look: [-6, 2.5, 3], opacity: 0.6, ping: 0, leave: 0.86 },
  { cam: [2, 12, 18], look: [-3, -1, -5], opacity: 0.6, ping: 0, leave: 0.86 },
  { cam: [12, 10, 14], look: [2, 0, 0], opacity: 0.3, ping: 0.35 },
  { cam: [0, 14, 22], look: [0, 0, 0], opacity: 0.16, ping: 0.35 },
  { cam: [-8, 12, 20], look: [0, 0, 0], opacity: 0.16, ping: 0.35 },
  { cam: [8, 12, 20], look: [0, 0, 0], opacity: 0.16, ping: 0.35 },
  { cam: [0, 4, 21], look: [0, 1, 0], opacity: 0.8, ping: 0.35 },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function createStage(container: HTMLElement, options: StageOptions) {
  const high = options.tier === 'high';
  const pixelRatio = Math.min(window.devicePixelRatio, high ? 1.75 : 1.25);

  const renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 200);

  const base = new Color('#c4d2ff');
  const accent = new Color('#4a76ff');
  const accent2 = new Color('#d63ce8');
  const { points: cloud, uniforms: pointUniforms, terrain, hole } = createTerrainPoints({
    high,
    pixelRatio,
    colors: { base, accent, accent2 },
  });
  scene.add(cloud);

  const riseLayer = createRiseLayer({
    scene,
    camera,
    canvas: renderer.domElement,
    high,
    pixelRatio,
    terrain: { positions: terrain.positions, randoms: terrain.randoms, hole },
    terrainUniforms: pointUniforms,
    heroView: { cam: KEYFRAMES[0].cam, look: KEYFRAMES[0].look },
    colors: { base, blue: accent, pink: accent2 },
  });

  const siteLayer = createSiteLayer({
    scene,
    high,
    pixelRatio,
    view: { cam: KEYFRAMES[1].cam },
    terrainUniforms: pointUniforms,
    colors: { base, blue: accent, pink: accent2 },
  });

  const interceptLayer = createInterceptLayer({
    scene,
    camera,
    high,
    pixelRatio,
    colors: { base, blue: accent, pink: accent2 },
  });

  const nexusLayer = createNexusLayer({
    scene,
    camera,
    high,
    pixelRatio,
    colors: { base, blue: accent, pink: accent2 },
  });

  /* Scroll state */
  const chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
  const frame = (el: HTMLElement) =>
    el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;

  const state = {
    cam: new Vector3(...KEYFRAMES[0].cam),
    look: new Vector3(...KEYFRAMES[0].look),
    opacity: 0,
    ping: 1,
    reveal: 0,
  };
  const target = { cam: new Vector3(), look: new Vector3(), opacity: 1, ping: 1 };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const start = performance.now();

  function readScroll() {
    const vh = window.innerHeight;
    let index = 0;
    let local = 0;
    chapters.forEach((chapter, i) => {
      const rect = frame(chapter).getBoundingClientRect();
      if (rect.top <= vh * 0.5) {
        index = i;
        local = Math.min(1, Math.max(0, (vh * 0.5 - rect.top) / Math.max(rect.height, 1)));
      }
    });
    const a = KEYFRAMES[Math.min(index, KEYFRAMES.length - 1)];
    const b = KEYFRAMES[Math.min(index + 1, KEYFRAMES.length - 1)];
    const t = smoothstep(a.leave ?? 0.55, 1, local);
    target.cam.set(lerp(a.cam[0], b.cam[0], t), lerp(a.cam[1], b.cam[1], t), lerp(a.cam[2], b.cam[2], t));
    target.look.set(lerp(a.look[0], b.look[0], t), lerp(a.look[1], b.look[1], t), lerp(a.look[2], b.look[2], t));
    target.opacity = lerp(a.opacity, b.opacity, t);
    target.ping = lerp(a.ping, b.ping, t);
  }

  function smoothstep(e0: number, e1: number, x: number) {
    const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return k * k * (3 - 2 * k);
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 58 : 42;
    camera.updateProjectionMatrix();
    riseLayer?.relayout();
  }

  let running = false;
  let raf = 0;
  let last = performance.now();

  function tick() {
    raf = requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const time = (now - start) / 1000;
    readScroll();

    const ease = 0.06;
    state.cam.lerp(target.cam, ease);
    state.look.lerp(target.look, ease);
    state.opacity = lerp(state.opacity, target.opacity, ease);
    state.ping = lerp(state.ping, target.ping, 0.08);
    state.reveal = Math.min(1, state.reveal + dt * 1.6);
    const grow = Math.min(1, Math.max(0, (time - GROW_START) / (GROW_END - GROW_START)));
    pointUniforms.uGrow.value = easeInOutCubic(grow);

    pointer.sx = lerp(pointer.sx, pointer.x, 0.04);
    pointer.sy = lerp(pointer.sy, pointer.y, 0.04);

    camera.position.set(state.cam.x + pointer.sx * 1.6, state.cam.y - pointer.sy * 0.8, state.cam.z);
    camera.lookAt(state.look);

    pointUniforms.uReveal.value = 1 - Math.pow(1 - state.reveal, 3);
    pointUniforms.uOpacity.value = state.opacity;
    pointUniforms.uPingStrength.value = state.ping;
    riseLayer?.update(dt, time, state.opacity);
    siteLayer?.update(dt, time, Math.min(1, state.opacity / 0.6));
    interceptLayer?.update(time, Math.min(1, state.opacity / 0.6));
    nexusLayer?.update(time, Math.min(1, state.opacity / 0.6));

    renderer.render(scene, camera);
  }

  function play() {
    if (running) return;
    running = true;
    last = performance.now();
    tick();
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };

  const story = document.querySelector('[data-story]');
  const visibility = new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : pause()));
  if (story) visibility.observe(story);
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : story && play()));

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointer, { passive: true });
  resize();
  riseLayer?.relayout(true);
  readScroll();
  state.cam.copy(target.cam);
  state.look.copy(target.look);
  play();
  requestAnimationFrame(() => {
    container.classList.add('is-live');
    window.dispatchEvent(new CustomEvent('stage:live'));
  });

  return { renderer, pause, play };
}

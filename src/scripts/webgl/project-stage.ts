import { Color, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { GROW_END, GROW_START } from './rise-layer';
import { clamp01, createSite, createStream, lerp, smooth, type Site } from './sites';
import { createTerrainPoints, easeInOutCubic } from './terrain-points';

/*
 * WebGL stage of the C2 / C4 project page. One chapter per keyframe, in DOM order:
 *   0 intro    the bare relief
 *   1 site     the devices of the first site rise one by one, then its dome
 *   2 c2       the site streams its data into the field laptop ([data-screen])
 *   3 network  the camera pulls back while more protected sites rise across the relief
 *   4 c4       the camera pulls back over the network. The chapter shows the C4 screens in HTML.
 */

interface Keyframe {
  cam: [number, number, number];
  look: [number, number, number];
  opacity: number;
  leave?: number;
}

/* The network and C4 views look at the relief from much further away than the home story does. */
const FOG = 120;
const MAIN = { x: 2, z: 5 };
const SATELLITES = [
  { x: -15, z: -4 },
  { x: 15, z: -9 },
  { x: -6, z: -15 },
  { x: 22, z: 7 },
  { x: -22, z: 11 },
  { x: 7, z: -21 },
];

const KEYFRAMES: Keyframe[] = [
  { cam: [0, 14, 32], look: [0, -2, 0], opacity: 0.8, leave: 0.4 },
  { cam: [-9, 5.5, 20], look: [-1.6, -3.4, 2.3], opacity: 0.6, leave: 0.9 },
  { cam: [-12, 6.5, 19], look: [-3.8, -3, 1.5], opacity: 0.55, leave: 0.92 },
  { cam: [-19, 26, 40], look: [-11, -3, -2], opacity: 1, leave: 0.9 },
  { cam: [-9, 22, 58], look: [-8, 15, -4], opacity: 0.95 },
];

interface StageOptions {
  tier: 'high' | 'low';
}

export function createProjectStage(container: HTMLElement, options: StageOptions) {
  const high = options.tier === 'high';
  const pixelRatio = Math.min(window.devicePixelRatio, high ? 1.75 : 1.25);

  const renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 200);

  const base = new Color('#c4d2ff');
  const blue = new Color('#4a76ff');
  const pink = new Color('#d63ce8');
  const colors = { base, blue, pink };

  const terrain = createTerrainPoints({ high, pixelRatio, colors: { base, accent: blue, accent2: pink } });
  scene.add(terrain.points);
  const tu = terrain.uniforms;
  const terrainSize = tu.uSize.value;
  tu.uFog.value = FOG;

  const chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
  const screenEl = chapters[2]?.querySelector<HTMLElement>('[data-screen]') ?? null;
  const wallEl = chapters[4]?.querySelector<HTMLElement>('[data-wall]') ?? null;

  const faceTo = (at: { x: number; z: number }, cam: [number, number, number]) => Math.atan2(cam[2] - at.z, cam[0] - at.x);
  const main = createSite({ scene, high, pixelRatio, colors, at: MAIN, face: faceTo(MAIN, KEYFRAMES[1].cam), pad: true, fog: FOG });
  const satellites: Site[] = SATELLITES.map((at, i) =>
    createSite({
      scene,
      high,
      pixelRatio,
      colors,
      at,
      face: faceTo(at, KEYFRAMES[3].cam),
      scale: 0.75,
      fog: FOG,
      detail: 'lite',
      seed: i + 1,
    }),
  );
  const sites = [main, ...satellites];

  const toLaptop = createStream({ scene, high, pixelRatio, colors, sources: [...main.deviceTops, ...main.domeSources(6)] });
  const toWall = createStream({
    scene,
    high,
    pixelRatio,
    colors,
    perLane: high ? 140 : 72,
    size: 2,
    sources: sites.flatMap((s) => s.domeSources(2)),
  });

  tu.uSpot.value.copy(main.centre);
  tu.uPad.value.set(main.padR, 0);

  const frame = (el: HTMLElement) => (el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el);
  const progressOf = (el?: HTMLElement) => (el ? parseFloat(el.style.getPropertyValue('--p')) || 0 : 0);
  const pinned = (el?: HTMLElement) => !!el?.classList.contains('is-pinned');
  /* How much of a chapter is on screen: fades in as it arrives, out once it starts to leave. */
  const presence = (el?: HTMLElement) => {
    if (!el) return 0;
    const vh = window.innerHeight;
    const r = frame(el).getBoundingClientRect();
    return clamp01((vh - r.top) / (vh * 0.6)) * clamp01((r.bottom - vh * 0.45) / (vh * 0.4));
  };

  const state = { cam: new Vector3(...KEYFRAMES[0].cam), look: new Vector3(...KEYFRAMES[0].look), opacity: 0, reveal: 0 };
  const target = { cam: new Vector3(), look: new Vector3(), opacity: 1 };
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
        local = clamp01((vh * 0.5 - rect.top) / Math.max(rect.height, 1));
      }
    });
    const a = KEYFRAMES[Math.min(index, KEYFRAMES.length - 1)];
    const b = KEYFRAMES[Math.min(index + 1, KEYFRAMES.length - 1)];
    const t = smooth((local - (a.leave ?? 0.55)) / (1 - (a.leave ?? 0.55)));
    target.cam.set(lerp(a.cam[0], b.cam[0], t), lerp(a.cam[1], b.cam[1], t), lerp(a.cam[2], b.cam[2], t));
    target.look.set(lerp(a.look[0], b.look[0], t), lerp(a.look[1], b.look[1], t), lerp(a.look[2], b.look[2], t));
    target.opacity = lerp(a.opacity, b.opacity, t);
  }

  /* Growth is tied to scroll, so scrolling back plays everything in reverse. */
  function updateSites(time: number, opacity: number) {
    const pSite = progressOf(chapters[1]);
    const pNet = progressOf(chapters[3]);
    main.set((i) => smooth((pSite - 0.06 - i * 0.09) / 0.14), smooth((pSite - 0.55) / 0.25));
    satellites.forEach((s, j) => {
      const at = 0.08 + j * 0.11;
      s.set(() => smooth((pNet - at) / 0.14), smooth((pNet - at - 0.05) / 0.16));
    });
    tu.uPad.value.y = smooth(pSite * 5);
    sites.forEach((s) => s.update(time, opacity));
  }

  function updateStreams(time: number, opacity: number) {
    const c2 = chapters[2];
    const c4 = chapters[4];
    /* Unpinned (small screens) the devices sit in the flow, so there is nothing to aim the lanes at. */
    const laptopFlow = screenEl && pinned(c2) ? clamp01((progressOf(c2) - 0.06) / 0.3) : 0;
    if (laptopFlow > 0 && screenEl) toLaptop.aimAt(screenEl, camera, canvas, main.centre);
    toLaptop.update(laptopFlow, time, opacity * presence(c2) * smooth(laptopFlow * 4));

    const wallFlow = wallEl && pinned(c4) ? clamp01((progressOf(c4) - 0.1) / 0.32) : 0;
    if (wallFlow > 0 && wallEl) toWall.aimAt(wallEl, camera, canvas, new Vector3(0, 0, 0), 0.55);
    toWall.update(wallFlow, time, opacity * presence(c4) * smooth(wallFlow * 4));
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 58 : 42;
    camera.updateProjectionMatrix();
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
    state.reveal = Math.min(1, state.reveal + dt * 1.6);
    tu.uGrow.value = easeInOutCubic(clamp01((time - GROW_START) / (GROW_END - GROW_START)));

    pointer.sx = lerp(pointer.sx, pointer.x, 0.04);
    pointer.sy = lerp(pointer.sy, pointer.y, 0.04);
    camera.position.set(state.cam.x + pointer.sx * 1.2, state.cam.y - pointer.sy * 0.6, state.cam.z);
    camera.lookAt(state.look);

    tu.uReveal.value = 1 - Math.pow(1 - state.reveal, 3);
    tu.uOpacity.value = state.opacity;
    /* Pulled back for the network and C4 views: grow and brighten the points so relief and domes stay legible. */
    const far = clamp01((camera.position.distanceTo(state.look) - 22) / 30);
    tu.uSize.value = terrainSize * (1 + far * 0.7);
    main.boost(1 + far * 0.8, 1 + far * 1.4);
    satellites.forEach((s) => s.boost(1 + far * 1.3, 1 + far * 2));
    const siteOpacity = Math.min(1, state.opacity / 0.55);
    updateSites(time, siteOpacity);
    updateStreams(time, siteOpacity);

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
  readScroll();
  state.cam.copy(target.cam);
  state.look.copy(target.look);
  play();
  requestAnimationFrame(() => container.classList.add('is-live'));

  return { renderer, pause, play };
}

import { Color, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { createIntercept } from './intercept-scene';
import { GROW_END, GROW_START } from './rise-layer';
import { clamp01, createSite, lerp, smooth } from './sites';
import { createTerrainPoints, easeInOutCubic } from './terrain-points';

/*
 * WebGL stage of the interceptor project page. One chapter per keyframe, in DOM order:
 *   0 intro    the protected site under its dome, the interceptor ready at its centre
 *   1 threat   a Shahed-type drone flies in from far away
 *   2 launch   the interceptor lifts off and climbs out of the dome
 *   3 seeker   both close in (the seeker view takes the screen)
 *   4 impact   direct hit outside the dome, the site stays safe
 *   5 specs    the calm relief
 * Everything is tied to scroll, so scrolling back plays it in reverse.
 */

interface Keyframe {
  cam: [number, number, number];
  look: [number, number, number];
  opacity: number;
  leave?: number;
}

const FOG = 110;
const SITE = { x: 2, z: 5 };

const KEYFRAMES: Keyframe[] = [
  { cam: [-12, 7, 22], look: [-4, -1, 3], opacity: 0.8, leave: 0.4 },
  { cam: [-16, 9, 26], look: [12, 1, -6], opacity: 0.75, leave: 0.85 },
  { cam: [-6, 0, 19], look: [4, 0, 2], opacity: 0.7, leave: 0.88 },
  { cam: [-12, 7, 24], look: [10, 10, -3], opacity: 0.28, leave: 0.88 },
  { cam: [-3, 7, 18], look: [12, 4, -3], opacity: 0.8, leave: 0.75 },
  { cam: [-10, 14, 30], look: [4, -2, 0], opacity: 0.5 },
];

interface StageOptions {
  tier: 'high' | 'low';
}

export function createInterceptorStage(container: HTMLElement, options: StageOptions) {
  const high = options.tier === 'high';
  const pixelRatio = Math.min(window.devicePixelRatio, high ? 1.75 : 1.25);

  const renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 200);

  const base = new Color('#c4d2ff');
  const blue = new Color('#4a76ff');
  const pink = new Color('#d63ce8');
  const colors = { base, blue, pink };

  const terrain = createTerrainPoints({ high, pixelRatio, colors: { base, accent: blue, accent2: pink } });
  scene.add(terrain.points);
  const tu = terrain.uniforms;
  tu.uFog.value = FOG;

  const chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));

  const site = createSite({
    scene,
    high,
    pixelRatio,
    colors,
    at: SITE,
    face: Math.atan2(KEYFRAMES[0].cam[2] - SITE.z, KEYFRAMES[0].cam[0] - SITE.x),
    pad: true,
    fog: FOG,
    domeGlow: 1.6,
  });
  tu.uSpot.value.copy(site.centre);
  tu.uPad.value.set(site.padR, 0);

  /* Inside the dome but in front of the device ring, so the launch reads on its own. */
  const pad = site.centre.clone().add(new Vector3(-2.2, 0, 3.9));
  const intercept = createIntercept({
    scene,
    high,
    pixelRatio,
    colors,
    pad,
    interceptorScale: 1.1,
    threatScale: 1.4,
    waypoint: pad.clone().add(new Vector3(9, 6.8, -7.5)),
    impact: site.centre.clone().add(new Vector3(12, 9, -8)),
    from: site.centre.clone().add(new Vector3(42, 12, -34)),
    fog: FOG,
  });

  const frame = (el: HTMLElement) => (el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el);
  const progressOf = (i: number) => {
    const el = chapters[i];
    if (!el) return 0;
    if (el.hasAttribute('data-pin')) return parseFloat(el.style.getPropertyValue('--p')) || 0;
    const vh = window.innerHeight;
    const r = frame(el).getBoundingClientRect();
    return clamp01((vh - r.top) / Math.max(r.height, 1));
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

  /* The drone and the interceptor both reach the impact point early in the impact chapter. */
  function updateIntercept(time: number, opacity: number) {
    const threat = progressOf(1);
    const launch = progressOf(2);
    const seeker = progressOf(3);
    const hit = progressOf(4);
    const closing = clamp01(hit / 0.2);
    intercept.set({
      ready: smooth(time - 1.6),
      threat: 0.55 * threat + 0.15 * launch + 0.25 * seeker + 0.05 * closing,
      launch: 0.35 * smooth(launch / 0.9) + 0.55 * seeker + 0.1 * closing,
      burst: clamp01((hit - 0.2) / 0.3),
    });
    intercept.update(time, opacity);
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
    tu.uPad.value.y = smooth(time - 0.4);

    const layerOpacity = Math.min(1, state.opacity / 0.55);
    site.set((i) => smooth((time - 0.6 - i * 0.18) / 0.6), smooth((time - 1.8) / 0.9));
    site.update(time, layerOpacity);
    updateIntercept(time, layerOpacity);

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

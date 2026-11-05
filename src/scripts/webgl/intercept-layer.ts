import { Color, PerspectiveCamera, Scene, Vector3 } from 'three';
import { createIntercept } from './intercept-scene';
import { clamp01, smooth } from './sites';
import { terrainHeight } from './terrain';

/*
 * The interceptor scene of the home projects chapter ([data-intercept]), driven by the chapter's scroll
 * progress: a Shahed-type drone flies in and is tracked, then locked; the interceptor launches, flies
 * toward it and hits it. The lock frame ([data-lock]) and the line of sight follow the scene on screen.
 * Scrolling back plays it in reverse.
 */

export const INTERCEPT_PAD = { x: -6, z: 8 };

interface InterceptLayerOptions {
  scene: Scene;
  camera: PerspectiveCamera;
  high: boolean;
  pixelRatio: number;
  colors: { base: Color; blue: Color; pink: Color };
}

const THREAT_SCALE = 1.25;
/* Chapter progress of each beat. */
const DETECT_AT = 0.24;
const LOCK_AT = 0.36;
const LAUNCH_AT = 0.4;
const LAUNCH_LEN = 0.36;
const HIT_AT = LAUNCH_AT + LAUNCH_LEN;

export function createInterceptLayer(o: InterceptLayerOptions) {
  const found = document.querySelector<HTMLElement>('[data-intercept]');
  if (!found) return null;
  const chapter: HTMLElement = found;
  const q = <T extends Element>(sel: string) => chapter.querySelector<T>(sel);
  const layer = q<HTMLElement>('.lock-layer');
  const lock = q<HTMLElement>('[data-lock]');
  const lockLine = q<SVGLineElement>('[data-lock-line]');

  const ground = (x: number, z: number) => new Vector3(x, terrainHeight(x, z), z);
  const pad = ground(INTERCEPT_PAD.x, INTERCEPT_PAD.z);
  const scene = createIntercept({
    scene: o.scene,
    high: o.high,
    pixelRatio: o.pixelRatio,
    colors: o.colors,
    pad,
    interceptorScale: 1.3,
    threatScale: THREAT_SCALE,
    groundAt: terrainHeight,
    waypoint: pad.clone().add(new Vector3(4, 6.4, -3.6)),
    impact: pad.clone().add(new Vector3(7, 8, -7)),
    from: pad.clone().add(new Vector3(36, 10, -30)),
  });

  const frame = () => (chapter.parentElement?.classList.contains('pin-spacer') ? chapter.parentElement : chapter);
  const v = new Vector3();
  let rect = chapter.getBoundingClientRect();

  function toScreen(at: Vector3) {
    v.copy(at).project(o.camera);
    return { x: (v.x + 1) * 0.5 * window.innerWidth - rect.left, y: (1 - v.y) * 0.5 * window.innerHeight - rect.top };
  }

  const setLine = (el: SVGLineElement | null, a: { x: number; y: number }, b: { x: number; y: number }, on: number) => {
    if (!el) return;
    el.setAttribute('x1', a.x.toFixed(1));
    el.setAttribute('y1', a.y.toFixed(1));
    el.setAttribute('x2', b.x.toFixed(1));
    el.setAttribute('y2', b.y.toFixed(1));
    el.style.opacity = on.toFixed(3);
  };
  const moveTo = (el: HTMLElement | null, at: { x: number; y: number }, on: number) => {
    if (!el) return;
    el.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px)`;
    el.style.opacity = on.toFixed(3);
  };
  const window01 = (p: number, a: number, b: number, fade = 0.03) => smooth((p - a) / fade) * (1 - smooth((p - b) / fade));

  function updateOverlays(p: number, vis: number) {
    if (!layer) return;
    const pinned = chapter.classList.contains('is-pinned');
    layer.style.opacity = (pinned ? vis : 0).toFixed(3);
    if (!pinned || vis < 0.001) return;

    o.camera.updateMatrixWorld();
    rect = chapter.getBoundingClientRect();
    const t = toScreen(scene.threatAt);
    const i = toScreen(scene.interceptorAt);

    /* The lock frame: tracking, then locked, then destroyed. */
    if (lock) {
      const dist = o.camera.position.distanceTo(scene.threatAt);
      const px = window.innerHeight / (2 * Math.tan((o.camera.fov * Math.PI) / 360));
      const size = Math.max(44, ((THREAT_SCALE * 2.4) / dist) * px);
      moveTo(lock, t, window01(p, DETECT_AT, HIT_AT + 0.12, 0.04));
      lock.style.setProperty('--size', `${size.toFixed(1)}px`);
      lock.dataset.side = t.x + size * 0.5 + 240 > rect.width ? 'left' : 'right';
      lock.dataset.state = p >= HIT_AT + 0.02 ? 'destroyed' : p >= LOCK_AT ? 'locked' : 'tracking';
    }
    setLine(lockLine, i, t, window01(p, LOCK_AT, HIT_AT));
  }

  function update(time: number, opacity: number) {
    const vh = window.innerHeight;
    const box = frame().getBoundingClientRect();
    const p = parseFloat(chapter.style.getPropertyValue('--p')) || 0;
    const vis = clamp01((vh - box.top) / (vh * 0.6)) * clamp01((box.bottom - vh * 0.45) / (vh * 0.4));
    const ready = smooth((p - 0.02) / 0.16);

    scene.set({
      ready,
      threat: clamp01((p - 0.16) / (HIT_AT - 0.16)),
      launch: clamp01((p - LAUNCH_AT) / LAUNCH_LEN),
      burst: clamp01((p - HIT_AT) / 0.14),
    });
    scene.update(time, opacity * vis);
    updateOverlays(p, vis * opacity);
  }

  return { update, pad: scene.padTop, impact: scene.impact };
}

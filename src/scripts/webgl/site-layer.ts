import { Color, Scene, Vector2, Vector3 } from 'three';
import { clamp01, createSite, DEVICE_ORDER, smooth } from './sites';

/*
 * The protected-site scene of the home projects chapter ([data-site]). Driven by the chapter's scroll
 * progress: the devices grow out of a levelled patch of relief one after another, then a dome of points
 * rises over them, and scrolling back takes them down again.
 */

const SITE = { x: 2, z: 5 };

/* Timeline in chapter progress. */
const START = 0.04;
const STAGGER = 0.1;
const RISE = 0.12;
const DOME_AT = START + DEVICE_ORDER.length * STAGGER + 0.02;
const DOME_RISE = 0.22;

interface SiteLayerOptions {
  scene: Scene;
  high: boolean;
  pixelRatio: number;
  view: { cam: [number, number, number] };
  terrainUniforms: { uSpot: { value: Vector3 }; uPad: { value: Vector2 } };
  colors: { base: Color; blue: Color; pink: Color };
}

export function createSiteLayer(o: SiteLayerOptions) {
  const found = document.querySelector<HTMLElement>('[data-site]');
  if (!found) return null;
  const chapter: HTMLElement = found;

  const site = createSite({
    scene: o.scene,
    high: o.high,
    pixelRatio: o.pixelRatio,
    colors: o.colors,
    at: SITE,
    face: Math.atan2(o.view.cam[2] - SITE.z, o.view.cam[0] - SITE.x),
    pad: true,
    domeGlow: 2.2,
  });

  const frame = () => (chapter.parentElement?.classList.contains('pin-spacer') ? chapter.parentElement : chapter);
  const heroSpot = new Vector3();
  const heroPad = new Vector2();
  let owning = false;

  function update(_dt: number, time: number, opacity: number) {
    const vh = window.innerHeight;
    const rect = frame().getBoundingClientRect();
    const p = parseFloat(chapter.style.getPropertyValue('--p')) || 0;

    const vis = clamp01((vh - rect.top) / (vh * 0.6)) * clamp01((rect.bottom - vh * 0.45) / (vh * 0.4));

    site.set((i) => smooth((p - START - i * STAGGER) / RISE), smooth((p - DOME_AT) / DOME_RISE));

    /* While the site is on screen it owns the terrain pad, then hands it back to the hero device. */
    const pad = o.terrainUniforms.uPad.value;
    const spot = o.terrainUniforms.uSpot.value;
    if (vis > 0) {
      if (!owning) {
        heroSpot.copy(spot);
        owning = true;
      }
      heroPad.copy(pad);
      spot.copy(site.centre);
      pad.set(site.padR, Math.max(heroPad.y, smooth(vis * 1.5)));
    } else if (owning) {
      spot.copy(heroSpot);
      owning = false;
    }

    site.update(time, opacity * vis);
  }

  return { update };
}

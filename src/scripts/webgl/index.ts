import { prefersReducedMotion } from '../motion';

type Tier = 'high' | 'low' | 'static';

function detectTier(): Tier {
  if (prefersReducedMotion()) return 'static';
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return 'static';
  const canvas = document.createElement('canvas');
  if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) return 'static';

  const cores = navigator.hardwareConcurrency || 4;
  const memory = nav.deviceMemory ?? 8;
  const small = window.matchMedia('(max-width: 899px)').matches;
  if (cores <= 2 || memory <= 2) return 'static';
  if (small || cores <= 4 || memory <= 4) return 'low';
  return 'high';
}

const whenIdle = (fn: () => void) => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 1500 });
  else setTimeout(fn, 600);
};

type StageFactory = (container: HTMLElement, options: { tier: 'high' | 'low' }) => unknown;
const homeStage = (): Promise<StageFactory> => import('./stage').then((m) => m.createStage);

export function initWebGL(container: HTMLElement | null, load: () => Promise<StageFactory> = homeStage) {
  if (!container) return;
  const tier = detectTier();
  container.dataset.tier = tier;
  if (tier === 'static') return;

  const boot = () =>
    whenIdle(() => {
      load()
        .then((createStage) => createStage(container, { tier }))
        .catch(() => (container.dataset.tier = 'static'));
    });

  /* The still is a frame of this scene, so smaller devices keep it until the visitor engages. */
  const start =
    tier === 'high'
      ? boot
      : () => {
          let done = false;
          const go = () => {
            if (done) return;
            done = true;
            events.forEach((type) => window.removeEventListener(type, go));
            boot();
          };
          const events = ['scroll', 'pointerdown', 'touchstart', 'keydown'] as const;
          events.forEach((type) => window.addEventListener(type, go, { once: true, passive: true }));
          setTimeout(go, 6000);
        };

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

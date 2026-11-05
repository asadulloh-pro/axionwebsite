import { SplitText } from 'gsap/SplitText';
import { gsap, prefersReducedMotion } from './motion';

gsap.registerPlugin(SplitText);

/*
 * Declarative effects:
 *   [data-split]          headline reveals line by line (masked words, blur to sharp)
 *   [data-split="load"]   same, but plays on load instead of on scroll
 *   [data-scrub]          words brighten from dim to full as the element scrolls through
 *   [data-media-reveal]   clip-path wipe with a slow inner zoom
 *   [data-decode="delay"] scrambled text that glitches in and resolves (hero copy)
 */

function whenNear(el: Element, fn: () => void, margin = '0px 0px -12% 0px') {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    },
    { rootMargin: margin },
  );
  io.observe(el);
}

/* Stretch one gradient across every word of a .grad-text run, measured before words animate. */
function paintGradient(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('.grad-text').forEach((run) => {
    const words = Array.from(run.children) as HTMLElement[];
    if (!words.length) return;
    const boxes = words.map((w) => w.getBoundingClientRect());
    const left = Math.min(...boxes.map((b) => b.left));
    const width = Math.max(...boxes.map((b) => b.right)) - left;
    words.forEach((w, i) => {
      w.style.setProperty('--gw', `${width}px`);
      w.style.setProperty('--gx', `${left - boxes[i].left}px`);
    });
  });
}

function splitHeadline(el: HTMLElement, delay: number) {
  SplitText.create(el, {
    type: 'lines,words',
    mask: 'lines',
    linesClass: 'split-line',
    autoSplit: true,
    onSplit(self) {
      el.classList.add('is-split');
      paintGradient(el);
      return gsap.from(self.words, {
        yPercent: 110,
        opacity: 0,
        filter: 'blur(8px)',
        duration: 1.4,
        ease: 'expo.out',
        stagger: 0.035,
        delay,
      });
    },
  });
}

/* Off-screen headlines are split lazily so the first frame only measures what is visible. */
function initSplit() {
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    if (el.dataset.split === 'load') splitHeadline(el, Number(el.dataset.splitDelay ?? 0.2));
    else whenNear(el, () => splitHeadline(el, 0));
  });
}

function initScrub() {
  document.querySelectorAll<HTMLElement>('[data-scrub]').forEach((el) => {
    SplitText.create(el, {
      type: 'words',
      autoSplit: true,
      onSplit(self) {
        el.classList.add('is-split');
        return gsap.fromTo(
          self.words,
          { opacity: 0.16 },
          {
            opacity: 1,
            ease: 'none',
            stagger: 0.08,
            scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 45%', scrub: 0.6 },
          },
        );
      },
    });
  });
}

function initMediaReveal() {
  document.querySelectorAll<HTMLElement>('[data-media-reveal]').forEach((el) => {
    gsap.set(el, { clipPath: 'inset(100% 0% 0% 0%)' });
    whenNear(el, () => {
      const inner = el.firstElementChild;
      const tl = gsap.timeline();
      tl.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' });
      if (inner) tl.fromTo(inner, { scale: 1.18 }, { scale: 1, duration: 2.2, ease: 'expo.out' }, 0);
    });
  });
}

function initCursor() {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'fx-cursor fx-cursor--dot';
  ring.className = 'fx-cursor fx-cursor--ring';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(dot, ring);
  document.documentElement.classList.add('has-cursor');

  const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });

  window.addEventListener(
    'pointermove',
    (e) => {
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
      document.documentElement.classList.add('cursor-ready');
    },
    { passive: true },
  );

  document.addEventListener('pointerover', (e) => {
    const target = (e.target as Element).closest('a, button, [data-cursor]');
    ring.classList.toggle('is-hover', Boolean(target));
  });

  document.addEventListener('pointerleave', () => document.documentElement.classList.remove('cursor-ready'));
}

/*
 * [data-decode]: text arrives scrambled behind a short slice glitch, then resolves left to right.
 * Waits for the hero scene to go live so the copy decodes while the relief grows.
 */
const GLYPHS: Record<string, string> = {
  ru: 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ',
  default: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
};

const WIDTH_POOLS: Record<string, string[]> = {
  ru: ['гзэс', 'шщжмыю', 'абвдеёийклнопруфхцчъья'],
  default: ['ijlft', 'mw', 'abcdeghknopqrsuvxyz'],
};

/*
 * Every character sits in a cell locked to its real width (words stay unbreakable), so the
 * scrambled glyphs never reflow the text. Cells inside .grad-text paint their own slice of
 * the gradient, measured across line fragments.
 */
function decode(el: HTMLElement, delay: number, duration: number) {
  const glyphs = GLYPHS[document.documentElement.lang] ?? GLYPHS.default;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.data.trim()) texts.push(node);
  }
  if (!texts.length) return;

  /* Swap glyphs within a similar width so a narrow slot never gets an "m" spilling out of it. */
  const pools = WIDTH_POOLS[document.documentElement.lang] ?? WIDTH_POOLS.default;
  const random = (ch: string) => {
    if (/\d/.test(ch)) return String(Math.floor(Math.random() * 10));
    const lower = ch.toLowerCase();
    const pool = pools.find((p) => p.includes(lower)) ?? glyphs.toLowerCase();
    const g = pool[Math.floor(Math.random() * pool.length)];
    return ch === lower ? g : g.toUpperCase();
  };
  const canScramble = (ch: string) => /\d/.test(ch) || pools.some((p) => p.includes(ch.toLowerCase()));

  const runs: { run: HTMLElement; text: Text }[] = [];
  const cells: { cell: HTMLElement; ch: string }[] = [];
  texts.forEach((text) => {
    const run = document.createElement('span');
    run.className = 'dc-run';
    for (const part of text.data.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        run.append(part);
        continue;
      }
      const word = document.createElement('span');
      word.className = 'dc-w';
      for (const ch of part) {
        const cell = document.createElement('span');
        cell.className = canScramble(ch) ? 'dc' : 'dc is-set';
        cell.textContent = ch;
        word.append(cell);
        cells.push({ cell, ch });
      }
      run.append(word);
    }
    runs.push({ run, text });
  });

  const label = el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  el.setAttribute('aria-label', label);
  runs.forEach(({ run, text }) => text.replaceWith(run));

  const widths = cells.map(({ cell }) => cell.getBoundingClientRect().width);
  const slices = cells.map(({ cell }) => {
    const grad = cell.closest<HTMLElement>('.grad-text');
    if (!grad) return null;
    const frags = Array.from(grad.getClientRects());
    const box = cell.getBoundingClientRect();
    const total = frags.reduce((s, f) => s + f.width, 0);
    let line = 0;
    frags.forEach((f, i) => {
      if (Math.abs(f.top - box.top) < Math.abs(frags[line].top - box.top)) line = i;
    });
    const before = frags.slice(0, line).reduce((s, f) => s + f.width, 0);
    return { total, offset: before + box.left - frags[line].left };
  });
  cells.forEach(({ cell }, i) => {
    cell.style.width = `${widths[i]}px`;
    const slice = slices[i];
    if (slice) {
      cell.classList.add('dc--grad');
      cell.style.setProperty('--gw', `${slice.total}px`);
      cell.style.setProperty('--gx', `${-slice.offset}px`);
    }
  });
  el.classList.add('is-celled');

  /* Each character resolves at its own moment, sweeping left to right with a little jitter. */
  const scrambles = cells.map(({ ch }) => canScramble(ch));
  const total = cells.length;
  const resolveAt = cells.map((_, i) => 0.25 + (i / total) * 0.6 + Math.random() * 0.15);

  const scramble = (progress: number) => {
    cells.forEach(({ cell, ch }, i) => {
      if (!scrambles[i]) return;
      if (progress >= resolveAt[i]) {
        if (!cell.classList.contains('is-set')) {
          cell.classList.add('is-set');
          cell.textContent = ch;
        }
      } else cell.textContent = random(ch);
    });
  };

  window.setTimeout(() => {
    scramble(0);
    el.classList.add('is-decoding');
    const t0 = performance.now();
    let lastSwap = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - t0) / (duration * 1000));
      if (now - lastSwap > 55 || progress >= 1) {
        lastSwap = now;
        scramble(progress);
      }
      if (progress < 1) requestAnimationFrame(step);
      else {
        runs.forEach(({ run, text }) => run.replaceWith(text));
        el.classList.remove('is-decoding', 'is-celled');
        el.classList.add('is-decoded');
        el.removeAttribute('aria-label');
      }
    };
    requestAnimationFrame(step);
  }, delay * 1000);
}

function initDecode() {
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-decode]'));
  if (!items.length) return;
  const run = () =>
    items.forEach((el) => decode(el, Number(el.dataset.decode || 0), Number(el.dataset.decodeDuration || 0.9)));

  const stage = document.querySelector<HTMLElement>('[data-webgl]');
  const waitsForStage = stage && stage.dataset.tier !== 'low' && stage.dataset.tier !== 'static';
  if (!waitsForStage || stage.classList.contains('is-live')) {
    run();
    return;
  }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    run();
  };
  window.addEventListener('stage:live', go, { once: true });
  window.setTimeout(go, 3500);
}

let started = false;

export function initFx() {
  if (started) return;
  started = true;

  if (prefersReducedMotion()) {
    document.querySelectorAll('[data-split], [data-scrub]').forEach((el) => el.classList.add('is-split'));
    document.querySelectorAll('[data-decode]').forEach((el) => el.classList.add('is-decoded'));
    return;
  }

  initMediaReveal();
  document.fonts.ready.then(() => {
    initSplit();
    initScrub();
    initDecode();
  });
  initCursor();
}

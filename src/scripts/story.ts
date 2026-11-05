import { gsap, ScrollTrigger, prefersReducedMotion } from './motion';

/*
 * Chapter contract:
 *   [data-chapter]            root of a chapter
 *   data-pin                  pin the chapter while it plays (desktop only)
 *   data-length="1.5"         pinned scroll distance, in viewport heights
 *   data-steps="4"            number of discrete steps mapped from progress
 *   [data-step-item="n"]      gets .is-on when step >= n, .is-current when step === n
 *   data-static-p="0"         progress used under reduced motion (default: end state)
 *
 * Progress is exposed as the CSS variable --p (0..1) and data-step on the root.
 */

function setProgress(chapter: HTMLElement, progress: number) {
  chapter.style.setProperty('--p', progress.toFixed(4));

  const steps = Number(chapter.dataset.steps || 0);
  if (!steps) return;

  const step = Math.min(steps - 1, Math.floor(progress * steps));
  if (chapter.dataset.step === String(step)) return;
  chapter.dataset.step = String(step);

  chapter.querySelectorAll<HTMLElement>('[data-step-item]').forEach((item) => {
    const n = Number(item.dataset.stepItem);
    item.classList.toggle('is-on', step >= n);
    item.classList.toggle('is-current', step === n);
  });
}

function initRail(chapters: HTMLElement[]) {
  const rail = document.querySelector<HTMLElement>('[data-story-rail]');
  if (!rail) return;
  const indexEl = rail.querySelector<HTMLElement>('[data-rail-index]');
  const labelEl = rail.querySelector<HTMLElement>('[data-rail-label]');
  const bar = rail.querySelector<HTMLElement>('[data-rail-bar]');
  const railed = chapters.filter((c) => c.dataset.rail !== undefined);
  const total = String(railed.length).padStart(2, '0');

  const activate = (chapter: HTMLElement) => {
    const i = railed.indexOf(chapter);
    if (i < 0) return;
    if (indexEl) indexEl.textContent = `${String(i + 1).padStart(2, '0')} / ${total}`;
    if (labelEl) labelEl.textContent = chapter.dataset.rail ?? '';
  };

  railed.forEach((chapter) => {
    ScrollTrigger.create({
      trigger: chapter,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => activate(chapter),
      onEnterBack: () => activate(chapter),
    });
  });

  const story = document.querySelector<HTMLElement>('[data-story]');
  if (story && bar) {
    ScrollTrigger.create({
      trigger: story,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => bar.style.setProperty('--rail-p', self.progress.toFixed(4)),
      onToggle: (self) => rail.classList.toggle('is-visible', self.isActive),
    });
  }

  if (railed[0]) activate(railed[0]);
}

function initParallax() {
  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
    const amount = Number(el.dataset.parallax || 0.15);
    gsap.fromTo(
      el,
      { yPercent: -amount * 50 },
      {
        yPercent: amount * 50,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });
}

export function initStory() {
  const chapters = gsap.utils.toArray<HTMLElement>('[data-chapter]');
  if (!chapters.length) return;

  if (prefersReducedMotion()) {
    document.documentElement.classList.add('story-static');
    chapters.forEach((chapter) => setProgress(chapter, Number(chapter.dataset.staticP ?? 0.999)));
    return;
  }

  const mm = gsap.matchMedia();

  mm.add(
    { desktop: '(min-width: 900px)', mobile: '(max-width: 899px)' },
    (context) => {
      const desktop = Boolean(context.conditions?.desktop);

      chapters.forEach((chapter) => {
        const pin = desktop && chapter.dataset.pin !== undefined;
        const length = Number(chapter.dataset.length || 1.5);
        chapter.classList.toggle('is-pinned', pin);

        ScrollTrigger.create({
          trigger: chapter,
          start: pin ? 'top top' : chapter.dataset.start || 'top 70%',
          end: pin ? `+=${length * 100}%` : chapter.dataset.end || 'bottom 60%',
          pin,
          pinSpacing: true,
          scrub: pin ? 0.6 : true,
          onUpdate: (self) => setProgress(chapter, self.progress),
          onRefresh: (self) => setProgress(chapter, self.progress),
        });
      });

      return () => chapters.forEach((chapter) => chapter.classList.remove('is-pinned'));
    },
  );

  initRail(chapters);
  initParallax();
  ScrollTrigger.refresh();
}

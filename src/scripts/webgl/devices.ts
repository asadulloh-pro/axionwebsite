// Point-cloud device silhouettes for the hero. Pure math, no three.js.
// Every device fits roughly in [-1, 1] on each axis, ground at y = -1.

type V3 = [number, number, number];
type Sampler = (r: () => number) => V3;
interface Part {
  weight: number;
  sample: Sampler;
  /* Spinning parts turn with the antenna; fixed parts stay put on the ground. */
  spin: boolean;
  /* Laser beams: position along the beam in (0, 1]; other parts are 0. */
  beamOf?: (p: V3) => number;
  /* Rotor parts spin about [x, y, z] (vertical axis) in direction w (±1). */
  hub?: [number, number, number, number];
}

export const DEVICE_IDS = ['radar', 'lidar', 'camera', 'jammer', 'uav', 'interceptor'] as const;

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

const TAU = Math.PI * 2;

function rotate([x, y, z]: V3, rx = 0, ry = 0, rz = 0): V3 {
  let a = y * Math.cos(rx) - z * Math.sin(rx);
  let b = y * Math.sin(rx) + z * Math.cos(rx);
  [y, z] = [a, b];
  a = x * Math.cos(ry) + z * Math.sin(ry);
  b = -x * Math.sin(ry) + z * Math.cos(ry);
  [x, z] = [a, b];
  a = x * Math.cos(rz) - y * Math.sin(rz);
  b = x * Math.sin(rz) + y * Math.cos(rz);
  return [a, b, z];
}

const add = (p: V3, o: V3): V3 => [p[0] + o[0], p[1] + o[1], p[2] + o[2]];

/* Surface of an axis-aligned box. */
function box(c: V3, w: number, h: number, d: number): Sampler {
  const areas = [h * d, h * d, w * d, w * d, w * h, w * h];
  const total = areas.reduce((s, a) => s + a, 0);
  return (r) => {
    let pick = r() * total;
    let face = 0;
    while (pick > areas[face] && face < 5) pick -= areas[face++];
    const u = r() - 0.5;
    const v = r() - 0.5;
    const s = face % 2 ? 0.5 : -0.5;
    const local: V3 =
      face < 2 ? [s * w, u * h, v * d] : face < 4 ? [u * w, s * h, v * d] : [u * w, v * h, s * d];
    return add(local, c);
  };
}

/* The twelve edges of a box, so silhouettes read crisply. */
function boxEdges(c: V3, w: number, h: number, d: number): Sampler {
  return (r) => {
    const axis = Math.floor(r() * 3);
    const t = r() - 0.5;
    const a = r() < 0.5 ? -0.5 : 0.5;
    const b = r() < 0.5 ? -0.5 : 0.5;
    const local: V3 = axis === 0 ? [t * w, a * h, b * d] : axis === 1 ? [a * w, t * h, b * d] : [a * w, b * h, t * d];
    return add(local, c);
  };
}

/* Side of a vertical cylinder, optionally with caps. */
function cylinder(c: V3, radius: number, height: number, caps = true): Sampler {
  const side = TAU * radius * height;
  const cap = Math.PI * radius * radius;
  return (r) => {
    const a = r() * TAU;
    if (caps && r() < cap / (side + cap)) {
      const rr = radius * Math.sqrt(r());
      return add([Math.cos(a) * rr, (r() < 0.5 ? -0.5 : 0.5) * height, Math.sin(a) * rr], c);
    }
    return add([Math.cos(a) * radius, (r() - 0.5) * height, Math.sin(a) * radius], c);
  };
}

function ring(c: V3, radius: number, rot: V3 = [0, 0, 0], arc = TAU): Sampler {
  return (r) => {
    const a = (r() - 0.5) * arc;
    return add(rotate([Math.cos(a) * radius, 0, Math.sin(a) * radius], ...rot), c);
  };
}

function disc(c: V3, radius: number, rot: V3 = [0, 0, 0]): Sampler {
  return (r) => {
    const a = r() * TAU;
    const rr = radius * Math.sqrt(r());
    return add(rotate([Math.cos(a) * rr, 0, Math.sin(a) * rr], ...rot), c);
  };
}

function sphere(c: V3, radius: number): Sampler {
  return (r) => {
    const u = r() * 2 - 1;
    const a = r() * TAU;
    const s = Math.sqrt(1 - u * u);
    return add([s * Math.cos(a) * radius, u * radius, s * Math.sin(a) * radius], c);
  };
}

function segment(a: V3, b: V3): Sampler {
  return (r) => {
    const t = r();
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  };
}

/* Parabolic dish opening along +y before rotation. */
function dish(c: V3, radius: number, depth: number, rot: V3): Sampler {
  return (r) => {
    const a = r() * TAU;
    const rr = radius * Math.sqrt(r());
    const y = depth * (rr / radius) ** 2;
    return add(rotate([Math.cos(a) * rr, y, Math.sin(a) * rr], ...rot), c);
  };
}

/* Flat triangle surface. */
function tri(a: V3, b: V3, c: V3): Sampler {
  return (r) => {
    let u = r();
    let v = r();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    return [
      a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v,
      a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * v,
      a[2] + (b[2] - a[2]) * u + (c[2] - a[2]) * v,
    ];
  };
}

/* Any sampler, rotated about its own origin and moved to c. */
function placed(s: Sampler, c: V3, rot: V3): Sampler {
  return (r) => add(rotate(s(r), ...rot), c);
}

const part = (weight: number, sample: Sampler, spin = true): Part => ({ weight, sample, spin });
const fixed = (weight: number, sample: Sampler) => part(weight, sample, false);

/* A low mound that thins outward, so the device settles into the terrain instead of standing on a plate. */
function footing(weight: number, radius = 0.75): Part[] {
  return [
    fixed(weight * 0.7, (r) => {
      const a = r() * TAU;
      const rr = radius * Math.sqrt(r());
      return [Math.cos(a) * rr, -1 + (1 - rr / radius) ** 2 * 0.12, Math.sin(a) * rr];
    }),
  ];
}

/* A spinning laser beam, dense at its source; each point carries its position along the beam. */
function beam(weight: number, a: V3, b: V3): Part {
  const s = segment(a, b);
  return {
    weight,
    spin: true,
    sample: (r) => {
      const t = Math.pow(r(), 1.4);
      return s(() => t);
    },
    beamOf: (p) => Math.max(0.001, Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]) / Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])),
  };
}

/* Surface of a round tube between two points. */
function tube(a: V3, b: V3, radius: number): Sampler {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const ax: V3 = [d[0] / len, d[1] / len, d[2] / len];
  const ref: V3 = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u: V3 = [ax[1] * ref[2] - ax[2] * ref[1], ax[2] * ref[0] - ax[0] * ref[2], ax[0] * ref[1] - ax[1] * ref[0]];
  const ul = Math.hypot(...u);
  const n: V3 = [u[0] / ul, u[1] / ul, u[2] / ul];
  const m: V3 = [ax[1] * n[2] - ax[2] * n[1], ax[2] * n[0] - ax[0] * n[2], ax[0] * n[1] - ax[1] * n[0]];
  return (r) => {
    const t = r();
    const ang = r() * TAU;
    const cs = Math.cos(ang) * radius;
    const sn = Math.sin(ang) * radius;
    return [0, 1, 2].map((k) => a[k] + d[k] * t + n[k] * cs + m[k] * sn) as V3;
  };
}

/* One tapered propeller blade from the hub outward at angle a, with a slight pitch. */
function blade(hub: V3, a: number, length: number): Sampler {
  return (r) => {
    const t = 0.1 + 0.9 * r();
    const chord = 0.055 * (1 - 0.55 * t) * (r() - 0.5);
    const along = t * length;
    return add(hub, [
      Math.cos(a) * along - Math.sin(a) * chord,
      chord * 0.35,
      Math.sin(a) * along + Math.cos(a) * chord,
    ]);
  };
}

/* Side of a truncated cone standing on c, from radius r0 at the bottom to r1 at height h. */
function cone(c: V3, r0: number, r1: number, h: number): Sampler {
  return (r) => {
    const t = r();
    const a = r() * TAU;
    const rr = r0 + (r1 - r0) * t;
    return add([Math.cos(a) * rr, t * h, Math.sin(a) * rr], c);
  };
}

interface Aperture {
  y: number;
  z: number;
  radius: number;
  depth: number;
  weight: number;
}

/*
 * EO/IR gimbal ball: the front is cut flat into a window plate facing +x, the optical windows are
 * recessed into it (bezel, bore, glass set back inside), and side caps cover the tilt axis.
 */
function gimbalBall(c: V3, radius: number, cut: number, apertures: Aperture[]): Part[] {
  const fx = radius * Math.cos(cut);
  const plateR = radius * Math.sin(cut);
  const inHole = (y: number, z: number, grow = 0) =>
    apertures.some((a) => (y - a.y) ** 2 + (z - a.z) ** 2 < (a.radius + grow) ** 2);
  const facing: V3 = [0, 0, Math.PI / 2];
  const onPlate = (y: number, z: number, back = 0): V3 => add(c, [fx - back, y, z]);

  const shell: Sampler = (r) => {
    for (;;) {
      const p = sphere([0, 0, 0], radius)(r);
      if (p[0] < fx) return add(p, c);
    }
  };
  const plate: Sampler = (r) => {
    for (;;) {
      const a = r() * TAU;
      const rr = plateR * Math.sqrt(r());
      const y = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      if (!inHole(y, z, 0.012)) return onPlate(y, z);
    }
  };

  return [
    part(9, shell),
    part(2.6, plate),
    part(2.2, placed(ring([0, 0, 0], plateR), onPlate(0, 0), facing)),
    part(1, placed(ring([0, 0, 0], plateR * 0.94), onPlate(0, 0, -0.006), facing)),
    ...[-1, 1].flatMap((side) => {
      const at: V3 = add(c, [0, 0, side * radius * 0.8]);
      const capR = radius * 0.6;
      return [
        part(1.3, ring(at, capR, [Math.PI / 2, 0, 0])),
        part(0.6, disc(add(at, [0, 0, side * 0.03]), capR * 0.4, [Math.PI / 2, 0, 0])),
      ];
    }),
    ...apertures.flatMap((a) => {
      const w = a.weight;
      const bore = placed(cylinder([0, 0, 0], a.radius, a.depth, false), onPlate(a.y, a.z, a.depth / 2), facing);
      return [
        part(1.5 * w, placed(ring([0, 0, 0], a.radius + 0.012), onPlate(a.y, a.z, -0.004), facing)),
        part(1.1 * w, bore),
        part(0.9 * w, placed(ring([0, 0, 0], a.radius * 0.92), onPlate(a.y, a.z, a.depth), facing)),
        part(0.35 * w, placed(disc([0, 0, 0], a.radius * 0.85), onPlate(a.y, a.z, a.depth), facing)),
        part(0.25 * w, placed(ring([0, 0, 0], a.radius * 0.55, [0, 0, 0], Math.PI * 0.45), onPlate(a.y, a.z, a.depth - 0.005), facing)),
      ];
    }),
  ];
}

/* Radial heat-sink fins around a vertical axis. */
function fins(n: number, inner: number, outer: number, y0: number, y1: number): Sampler {
  return (r) => {
    const a = (Math.floor(r() * n) / n) * TAU;
    const rr = inner + (outer - inner) * r();
    return [Math.cos(a) * rr, y0 + (y1 - y0) * r(), Math.sin(a) * rr];
  };
}

/* Three legs from a hub down to the ground; fixed. */
function tripod(spread: number, hub: number): Part[] {
  return [0, 1, 2].flatMap((i) => {
    const a = (i / 3) * TAU + 0.5;
    const foot: V3 = [Math.cos(a) * spread, -0.99, Math.sin(a) * spread];
    return [
      fixed(0.9, segment([Math.cos(a) * 0.08, hub, Math.sin(a) * 0.08], foot)),
      fixed(0.25, disc(foot, 0.06)),
    ];
  }).concat(fixed(0.7, cylinder([0, hub, 0], 0.1, 0.12)));
}

/* Grid of T/R module seams on the front face of a w × h panel. */
function moduleGrid(w: number, h: number, cols: number, rows: number, z: number): Sampler {
  return (r) => {
    if (r() < (cols - 1) / (cols + rows - 2)) {
      const x = (Math.floor(r() * (cols - 1)) + 1) / cols - 0.5;
      return [x * w, (r() - 0.5) * h, z];
    }
    const y = (Math.floor(r() * (rows - 1)) + 1) / rows - 0.5;
    return [(r() - 0.5) * w, y * h, z];
  };
}

/* Surface of revolution around the vertical axis through c, radius given by height. */
function revolve(c: V3, y0: number, y1: number, radius: (y: number) => number): Sampler {
  return (r) => {
    const y = y0 + (y1 - y0) * r();
    const a = r() * TAU;
    const rr = radius(y);
    return add([Math.cos(a) * rr, y, Math.sin(a) * rr], c);
  };
}

/* Flat panel in the vertical plane at heading a: root edge on the body, tip edge further out. */
function panel(a: number, root: [number, number, number], tip: [number, number, number]): Sampler {
  return (r) => {
    const t = r();
    const rad = root[0] + (tip[0] - root[0]) * t;
    const lo = root[1] + (tip[1] - root[1]) * t;
    const hi = root[2] + (tip[2] - root[2]) * t;
    const y = lo + (hi - lo) * r();
    return [Math.cos(a) * rad, y, Math.sin(a) * rad];
  };
}

/* Tail-sitting interceptor: bullet fuselage, nose up, four delta wings in an X with a motor pod on each tip. */
const BODY_R = 0.17;
const NOSE_AT = 0.42;
const NOSE_TOP = 0.95;
const bodyRadius = (y: number) => {
  if (y > NOSE_AT) return BODY_R * Math.sqrt(Math.max(0, 1 - ((y - NOSE_AT) / (NOSE_TOP - NOSE_AT)) ** 2.4));
  if (y < -0.7) return BODY_R - (-0.7 - y) * 0.35;
  return BODY_R;
};
const WING_TIP = 0.62;

/* Key grid lying flat (x-z) at height y, centred on z = cz. */
function moduleGridFlat(w: number, d: number, cols: number, rows: number, y: number, cz: number): Sampler {
  return (r) => {
    const g = moduleGrid(w, d, cols, rows, 0)(r);
    return [g[0], y, cz + g[1]];
  };
}

/* The interceptor without its ground mound, for flight. */
const INTERCEPTOR_BODY: Part[] = [
  part(8, revolve([0, 0, 0], -0.86, NOSE_TOP, bodyRadius)),
  part(0.9, disc([0, NOSE_TOP - 0.008, 0], 0.07)),
  part(0.8, ring([0, NOSE_TOP - 0.012, 0], 0.075)),
  part(0.4, ring([0, 0.62, 0], bodyRadius(0.62) + 0.003)),
  part(0.5, segment([BODY_R, 0.3, 0], [BODY_R, -0.6, 0])),
  part(0.3, box([0, 0.36, BODY_R], 0.08, 0.03, 0.01)),
  part(0.6, disc([0, -0.86, 0], bodyRadius(-0.86))),
  ...[0, 1, 2, 3].flatMap((k) => {
    const a = k * (Math.PI / 2) + Math.PI / 4;
    const pod: V3 = [Math.cos(a) * WING_TIP, 0, Math.sin(a) * WING_TIP];
    const prop = add(pod, [0, -0.66, 0]);
    const spinAt: [number, number, number, number] = [prop[0], prop[1], prop[2], k % 2 ? -1 : 1];
    return [
      part(3.4, panel(a, [BODY_R, -0.6, 0.2], [WING_TIP - 0.04, -0.6, -0.42])),
      part(1.3, panel(a, [BODY_R, 0.2, 0.2], [WING_TIP - 0.04, -0.42, -0.42])),
      part(0.6, panel(a, [BODY_R, -0.6, -0.6], [WING_TIP - 0.04, -0.6, -0.6])),
      part(0.9, panel(a, [bodyRadius(-0.86), -0.86, -0.6], [0.34, -0.99, -0.88])),
      part(2.2, revolve(pod, -0.5, -0.24, (y) => 0.075 * Math.sqrt(Math.max(0, 1 - ((y + 0.5) / 0.26) ** 2)))),
      part(1.4, cylinder(add(pod, [0, -0.56, 0]), 0.062, 0.12, false)),
      part(0.4, ring(add(pod, [0, -0.6, 0]), 0.064)),
      ...[0, Math.PI].map((b) => ({ ...part(0.55, blade(prop, b + k, 0.3)), hub: spinAt })),
      { ...part(0.18, disc(prop, 0.3)), hub: spinAt },
    ];
  }),
];

/* Shahed-type loitering munition, nose along +x: slim fuselage, cropped delta wing, wingtip fins, rear pusher prop. */
const SHAHED_R = 0.085;
const shahedRadius = (y: number) => {
  if (y > 0.75) return SHAHED_R * Math.sqrt(Math.max(0, 1 - ((y - 0.75) / 0.25) ** 2));
  if (y < -0.8) return SHAHED_R * Math.max(0.35, 1 - (-0.8 - y) * 3.5);
  return SHAHED_R;
};
const NOSE_X: V3 = [0, 0, -Math.PI / 2];
const SHAHED_HUB: [number, number, number, number] = [-1.04, 0, 0, 1];
const SHAHED: Part[] = [
  part(6, placed(revolve([0, 0, 0], -1, 1, shahedRadius), [0, 0, 0], NOSE_X)),
  ...[-1, 1].flatMap((side) => [
    part(5, tri([0.3, 0, side * SHAHED_R], [-0.72, 0, side * 0.86], [-0.86, 0, side * SHAHED_R])),
    part(1.4, segment([0.3, 0, side * SHAHED_R], [-0.72, 0, side * 0.86])),
    part(0.8, segment([-0.72, 0, side * 0.86], [-0.86, 0, side * 0.82])),
    part(1.2, tri([-0.62, 0, side * 0.86], [-0.84, 0, side * 0.86], [-0.8, 0.26, side * 0.86])),
    part(0.5, tri([-0.66, 0, side * 0.86], [-0.84, 0, side * 0.86], [-0.8, -0.12, side * 0.86])),
  ]),
  part(0.6, cylinder([-1.02, 0, 0], 0.03, 0.06)),
  /* Pusher prop; its hub spins about the x axis (the flight shader picks the axis). */
  ...[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((b) => ({
    ...part(0.7, placed(segment([0, 0, 0.03], [0, 0, 0.24]), [-1.04, 0, 0], [b, 0, 0])),
    hub: SHAHED_HUB,
  })),
  { ...part(0.3, placed(ring([0, 0, 0], 0.24), [-1.04, 0, 0], [0, 0, Math.PI / 2])), hub: SHAHED_HUB },
];

/* A person on foot, mid-stride, facing +x; feet at y = 0, about 1.7 tall. */
const PERSON: Part[] = [
  fixed(1.6, sphere([0, 1.58, 0], 0.11)),
  fixed(0.3, segment([0, 1.44, 0], [0, 1.5, 0])),
  fixed(3.4, tube([0, 0.95, 0], [0, 1.42, 0], 0.15)),
  fixed(0.8, segment([0, 1.4, -0.2], [0, 1.4, 0.2])),
  fixed(0.9, box([-0.18, 1.18, 0], 0.12, 0.34, 0.26)),
  fixed(1.1, tube([0, 1.38, 0.2], [-0.12, 0.92, 0.24], 0.045)),
  fixed(1.1, tube([0, 1.38, -0.2], [0.14, 0.94, -0.24], 0.045)),
  fixed(1.8, tube([0, 0.95, 0.09], [0.2, 0.05, 0.1], 0.065)),
  fixed(1.8, tube([0, 0.95, -0.09], [-0.16, 0.05, -0.1], 0.065)),
];

/* Rotating flat-panel (AESA) surveillance radar on a tripod mast. */
const PANEL_TILT: V3 = [-0.26, 0, 0];
const PANEL_AT: V3 = [0, 0.55, 0];
const onPanel = (s: Sampler) => placed(s, PANEL_AT, PANEL_TILT);

/* Shapes used outside the hero cycle (the protected-site scene). */
export type ShapeId = (typeof DEVICE_IDS)[number] | 'rfsensor' | 'interceptorAir' | 'shahed' | 'person';

const DEVICES: Record<ShapeId, Part[]> = {
  radar: [
    ...tripod(0.62, -0.55),
    fixed(1.6, cylinder([0, -0.3, 0], 0.05, 0.5, false)),
    fixed(1.1, cylinder([0, -0.02, 0], 0.15, 0.1)),
    part(1, cylinder([0, 0.07, 0], 0.12, 0.08)),
    part(1, box([0, 0.22, -0.06], 0.2, 0.24, 0.12)),
    part(7, onPanel(box([0, 0, 0], 1.1, 0.78, 0.07))),
    part(2.6, onPanel(boxEdges([0, 0, 0], 1.1, 0.78, 0.07))),
    part(3, onPanel(moduleGrid(1.1, 0.78, 12, 8, 0.037))),
    part(2, onPanel(box([0, 0, -0.11], 0.72, 0.46, 0.14))),
    part(0.8, onPanel(boxEdges([0, 0, -0.11], 0.72, 0.46, 0.14))),
    part(0.5, onPanel(segment([0.3, 0.23, -0.12], [0.3, 0.42, -0.12]))),
    ...footing(0.6),
  ],
  /* Spinning 3D lidar (Ouster/Velodyne style): fixed housing, the laser fan turns inside the window. */
  lidar: [
    ...tripod(0.55, -0.45),
    fixed(1.2, cylinder([0, -0.2, 0], 0.045, 0.5, false)),
    fixed(0.7, cylinder([0, 0.07, 0], 0.22, 0.04)),
    fixed(0.6, segment([0.2, 0.15, 0.2], [0.06, 0.02, 0.06])),
    fixed(0.8, segment([0.06, 0.02, 0.06], [0.05, -0.42, 0.05])),
    fixed(2, cylinder([0, 0.11, 0], 0.37, 0.04)),
    fixed(1, ring([0, 0.13, 0], 0.37)),
    fixed(2, cylinder([0, 0.18, 0], 0.34, 0.1, false)),
    fixed(0.6, box([0, 0.17, 0.35], 0.1, 0.06, 0.04)),
    fixed(1.2, cylinder([0, 0.36, 0], 0.315, 0.26, false)),
    fixed(1.3, ring([0, 0.23, 0], 0.34)),
    fixed(1.3, ring([0, 0.49, 0], 0.34)),
    fixed(1.6, cylinder([0, 0.53, 0], 0.34, 0.08, false)),
    fixed(4, fins(40, 0.3, 0.365, 0.5, 0.64)),
    fixed(1.4, disc([0, 0.65, 0], 0.3)),
    fixed(1.2, ring([0, 0.65, 0], 0.355)),
    /* Vertical fan of laser channels, pulses run along it in the shader. */
    ...Array.from({ length: 16 }, (_, i) => {
      const y = 0.27 + (i / 15) * 0.18;
      const pitch = (-15 + i * 2) * (Math.PI / 180);
      return beam(0.45, [0.32, y, 0], [1, y + Math.tan(pitch) * 0.68, 0]);
    }),
    ...footing(0.5, 0.65),
  ],
  /* EO/IR ball gimbal on a ribbed pedestal: the ball pans, two stacked lens windows face +x. */
  camera: [
    fixed(2.2, cone([0, -1, 0], 0.62, 0.5, 0.22)),
    fixed(1, ring([0, -0.99, 0], 0.62)),
    fixed(3, cylinder([0, -0.53, 0], 0.5, 0.46, false)),
    ...[-0.7, -0.64, -0.58, -0.52, -0.46].map((y) => fixed(0.7, ring([0, y, 0], 0.515))),
    fixed(1.6, cylinder([0, -0.27, 0], 0.54, 0.06)),
    fixed(1.2, cone([0, -0.24, 0], 0.5, 0.4, 0.08)),
    ...[-0.12, 0, 0.12].map((z) => fixed(0.15, box([0.51, -0.41, z], 0.02, 0.05, 0.06))),
    ...gimbalBall([0, 0.36, 0], 0.6, 0.6, [
      { y: 0, z: -0.09, radius: 0.16, depth: 0.1, weight: 1 },
      { y: 0.13, z: 0.17, radius: 0.085, depth: 0.07, weight: 0.6 },
      { y: -0.06, z: 0.17, radius: 0.024, depth: 0.03, weight: 0.12 },
      { y: -0.15, z: 0.17, radius: 0.036, depth: 0.04, weight: 0.16 },
    ]),
    ...footing(0.5, 0.75),
  ],
  jammer: [
    part(2.4, cylinder([0, -0.05, 0], 0.05, 1.5, false)),
    ...[0, 1, 2].map((i) => {
      const a = (i / 3) * TAU + 0.3;
      return part(1, segment([0, -0.5, 0], [Math.cos(a) * 0.7, -1, Math.sin(a) * 0.7]));
    }),
    ...[0, 1, 2].flatMap((i) => {
      const a = (i / 3) * TAU + 0.3;
      const c: V3 = [Math.cos(a) * 0.3, 0.15, Math.sin(a) * 0.3];
      return [
        part(3.4, placed(box([0, 0, 0], 0.34, 0.86, 0.06), c, [0, -a + Math.PI / 2, 0])),
        part(1.6, placed(boxEdges([0, 0, 0], 0.34, 0.86, 0.06), c, [0, -a + Math.PI / 2, 0])),
      ];
    }),
    part(1.6, segment([-0.55, 0.78, 0], [0.55, 0.78, 0])),
    ...[-0.45, -0.25, -0.05, 0.15, 0.35, 0.5].map((x, i) =>
      part(0.45, segment([x, 0.78, -0.26 + i * 0.02], [x, 0.78, 0.26 - i * 0.02])),
    ),
    ...footing(0.8),
  ],
  /* Industrial X-quadcopter hovering above the spot, nose along +x. */
  uav: [
    part(3.4, box([0, 0.1, 0], 0.56, 0.14, 0.34)),
    part(1.4, boxEdges([0, 0.1, 0], 0.56, 0.14, 0.34)),
    part(1.4, box([0.04, 0.2, 0], 0.44, 0.06, 0.28)),
    part(0.8, box([0.3, 0.1, 0], 0.06, 0.1, 0.26)),
    part(1.2, box([-0.08, 0.26, 0], 0.28, 0.06, 0.2)),
    part(0.6, boxEdges([-0.08, 0.26, 0], 0.28, 0.06, 0.2)),
    part(0.4, segment([-0.16, 0.29, 0], [-0.16, 0.4, 0])),
    part(0.6, cylinder([-0.16, 0.41, 0], 0.07, 0.025)),
    ...[
      [1, 1, 1],
      [-1, 1, -1],
      [1, -1, -1],
      [-1, -1, 1],
    ].flatMap(([sx, sz, dir]) => {
      const motor: V3 = [sx * 0.55, 0.16, sz * 0.55];
      const prop = add(motor, [0, 0.07, 0]);
      const spinAt: [number, number, number, number] = [prop[0], prop[1], prop[2], dir];
      return [
        part(1.3, tube([sx * 0.2, 0.12, sz * 0.12], motor, 0.028)),
        part(0.9, cylinder(motor, 0.06, 0.09)),
        part(0.3, cylinder(add(motor, [0, -0.07, 0]), 0.025, 0.06)),
        part(0.25, sphere(add(motor, [0, -0.1, 0]), 0.018)),
        ...[0, Math.PI].map((a) => ({ ...part(0.75, blade(prop, a + sx * 0.7, 0.36)), hub: spinAt })),
        { ...part(0.35, disc(prop, 0.36)), hub: spinAt },
      ];
    }),
    part(0.5, box([0.24, -0.01, 0], 0.08, 0.03, 0.12)),
    part(0.9, sphere([0.26, -0.1, 0], 0.075)),
    part(0.4, placed(ring([0, 0, 0], 0.035), [0.335, -0.1, 0], [0, 0, Math.PI / 2])),
    ...[-1, 1].flatMap((side) => [
      part(0.6, tube([0.1, 0.03, side * 0.13], [0.13, -0.3, side * 0.24], 0.012)),
      part(0.6, tube([-0.1, 0.03, side * 0.13], [-0.13, -0.3, side * 0.24], 0.012)),
      part(0.9, tube([-0.3, -0.3, side * 0.24], [0.3, -0.3, side * 0.24], 0.016)),
    ]),
    ...footing(0.35, 0.55),
  ],
  interceptor: [...INTERCEPTOR_BODY, ...footing(0.3, 0.6)],
  interceptorAir: INTERCEPTOR_BODY,
  shahed: SHAHED,
  person: PERSON,
  /* Direction-finding RF sensor: a ring of vertical dipoles on a mast, radome on top; the array turns slowly. */
  rfsensor: [
    ...tripod(0.5, -0.6),
    fixed(1.6, cylinder([0, -0.15, 0], 0.045, 0.9, false)),
    fixed(0.8, box([0, -0.42, 0.06], 0.16, 0.2, 0.08)),
    fixed(0.4, boxEdges([0, -0.42, 0.06], 0.16, 0.2, 0.08)),
    part(1, cylinder([0, 0.32, 0], 0.08, 0.06)),
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * TAU;
      const at: V3 = [Math.cos(a) * 0.42, 0.4, Math.sin(a) * 0.42];
      return [
        part(0.35, segment([Math.cos(a) * 0.08, 0.32, Math.sin(a) * 0.08], [at[0], 0.32, at[2]])),
        part(0.9, cylinder(at, 0.018, 0.44, false)),
        part(0.25, sphere(add(at, [0, 0.23, 0]), 0.022)),
        part(0.25, sphere(add(at, [0, -0.23, 0]), 0.022)),
      ];
    }).flat(),
    part(0.9, ring([0, 0.18, 0], 0.42)),
    part(0.9, ring([0, 0.62, 0], 0.42)),
    part(1.4, cylinder([0, 0.7, 0], 0.16, 0.12, false)),
    part(1.2, dish([0, 0.76, 0], 0.16, 0.08, [0, 0, 0])),
    ...footing(0.5, 0.6),
  ],
};

export interface DeviceCloud {
  shape: Float32Array;
  spin: Float32Array;
  beam: Float32Array;
  hub: Float32Array;
}

const NO_HUB: [number, number, number, number] = [0, 0, 0, 0];

interface Point {
  p: V3;
  spin: boolean;
  beam: number;
  hub: [number, number, number, number];
}

/* Lowest points first, so the ground under the spot feeds the base of the device. */
function pack(pts: Point[]): DeviceCloud {
  pts.sort((a, b) => a.p[1] - b.p[1] || a.p[0] - b.p[0]);
  const shape = new Float32Array(pts.length * 3);
  const spin = new Float32Array(pts.length);
  const beam = new Float32Array(pts.length);
  const hub = new Float32Array(pts.length * 4);
  pts.forEach((pt, i) => {
    shape.set(pt.p, i * 3);
    spin[i] = pt.spin ? 1 : 0;
    beam[i] = pt.beam;
    hub.set(pt.hub, i * 4);
  });
  return { shape, spin, beam, hub };
}

function sample(part: Part, r: () => number): Point {
  const p = part.sample(r);
  return { p, spin: part.spin, beam: part.beamOf?.(p) ?? 0, hub: part.hub ?? NO_HUB };
}

export function buildShape(id: ShapeId, count: number, seed = 1000): DeviceCloud {
  const parts = DEVICES[id];
  const r = rng(seed);
  const total = parts.reduce((s, p) => s + p.weight, 0);
  const pts: Point[] = [];
  parts.forEach((p, i) => {
    const n = i === parts.length - 1 ? count - pts.length : Math.round((count * p.weight) / total);
    for (let k = 0; k < n && pts.length < count; k++) pts.push(sample(p, r));
  });
  while (pts.length < count) pts.push(sample(parts[0], r));
  return pack(pts);
}

export function buildDevices(count: number): DeviceCloud[] {
  return DEVICE_IDS.map((id, d) => buildShape(id, count, 1000 + d * 97));
}

/* A cloud baked from a real model by scripts/bake-device.ts: [x, y, z, spin] per point, shuffled. */
export function bakedDevice(data: Float32Array, count: number): DeviceCloud {
  const available = Math.floor(data.length / 4);
  const pts: Point[] = [];
  for (let i = 0; i < count; i++) {
    const k = (i % available) * 4;
    pts.push({ p: [data[k], data[k + 1], data[k + 2]], spin: data[k + 3] > 0.5, beam: 0, hub: NO_HUB });
  }
  return pack(pts);
}

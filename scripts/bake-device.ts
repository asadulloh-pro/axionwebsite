/*
 * Bakes a .glb/.gltf model into a point cloud for the hero devices.
 *
 *   pnpm bake:device <model.glb> <id> [--spin=<node name regex>] [--count=12000] [--yaw=<deg>]
 *
 * Writes src/assets/devices/<id>.bin: Float32 [x, y, z, spin] per point, shuffled,
 * fitted into [-1, 1] with the ground at y = -1. Points from nodes matching --spin
 * (or their children) rotate with the antenna; the rest stays fixed.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { NodeIO, type Node } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const [input, id] = args.filter((a) => !a.startsWith('--'));
if (!input || !id) {
  console.error('Usage: pnpm bake:device <model.glb> <id> [--spin=regex] [--count=12000] [--yaw=deg]');
  process.exit(1);
}
const count = Number(flag('count') ?? 12000);
const spin = flag('spin') ? new RegExp(flag('spin')!, 'i') : null;
const yaw = (Number(flag('yaw') ?? 0) * Math.PI) / 180;

type V3 = [number, number, number];
interface Tri {
  a: V3;
  b: V3;
  c: V3;
  area: number;
  spin: number;
}

function transform(m: number[], [x, y, z]: V3): V3 {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

function area(a: V3, b: V3, c: V3) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const x = u[1] * v[2] - u[2] * v[1];
  const y = u[2] * v[0] - u[0] * v[2];
  const z = u[0] * v[1] - u[1] * v[0];
  return Math.sqrt(x * x + y * y + z * z) / 2;
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

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'meshopt.decoder': MeshoptDecoder,
  });
const doc = await io.read(resolve(input));

const tris: Tri[] = [];
function visit(node: Node, spinning: boolean) {
  const spins = spinning || (!!spin && spin.test(node.getName()));
  const mesh = node.getMesh();
  if (mesh) {
    const m = node.getWorldMatrix() as unknown as number[];
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue;
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const idx = prim.getIndices();
      const n = idx ? idx.getCount() : pos.getCount();
      const at = (k: number) => transform(m, pos.getElement(idx ? idx.getScalar(k) : k, [0, 0, 0]) as V3);
      for (let k = 0; k + 2 < n; k += 3) {
        const a = at(k);
        const b = at(k + 1);
        const c = at(k + 2);
        const s = area(a, b, c);
        if (s > 0) tris.push({ a, b, c, area: s, spin: spins ? 1 : 0 });
      }
    }
  }
  node.listChildren().forEach((child) => visit(child, spins));
}
for (const scene of doc.getRoot().listScenes()) scene.listChildren().forEach((n) => visit(n, false));
if (!tris.length) throw new Error('No triangles found in the model.');
if (spin && !tris.some((t) => t.spin)) {
  const names = doc.getRoot().listNodes().map((n) => n.getName()).filter(Boolean);
  console.warn(`--spin matched no nodes. Node names:\n  ${names.join('\n  ')}`);
}

/* Area-weighted surface samples. */
const r = rng(42);
const cdf: number[] = [];
let total = 0;
for (const t of tris) cdf.push((total += t.area));
const pts: { p: V3; spin: number }[] = [];
for (let i = 0; i < count; i++) {
  const x = r() * total;
  let lo = 0;
  let hi = cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  const t = tris[lo];
  let u = r();
  let v = r();
  if (u + v > 1) [u, v] = [1 - u, 1 - v];
  const w = 1 - u - v;
  pts.push({
    p: [0, 1, 2].map((k) => t.a[k] * w + t.b[k] * u + t.c[k] * v) as V3,
    spin: t.spin,
  });
}

/* Fit into [-1, 1], ground at -1, centred on the footprint, optional yaw. */
const min: V3 = [Infinity, Infinity, Infinity];
const max: V3 = [-Infinity, -Infinity, -Infinity];
for (const { p } of pts) for (let k = 0; k < 3; k++) [min[k], max[k]] = [Math.min(min[k], p[k]), Math.max(max[k], p[k])];
const size = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
const cx = (min[0] + max[0]) / 2;
const cz = (min[2] + max[2]) / 2;
const out = new Float32Array(count * 4);
pts.forEach(({ p, spin: s }, i) => {
  const x = ((p[0] - cx) / size) * 2;
  const z = ((p[2] - cz) / size) * 2;
  out[i * 4] = x * Math.cos(yaw) - z * Math.sin(yaw);
  out[i * 4 + 1] = ((p[1] - min[1]) / size) * 2 - 1;
  out[i * 4 + 2] = x * Math.sin(yaw) + z * Math.cos(yaw);
  out[i * 4 + 3] = s;
});

const file = resolve('src/assets/devices', `${id}.bin`);
await mkdir(dirname(file), { recursive: true });
await writeFile(file, Buffer.from(out.buffer));
const spinning = pts.filter((p) => p.spin).length;
console.log(`${file}: ${count} points from ${tris.length} triangles, ${spinning} spinning.`);

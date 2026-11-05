// Procedural terrain heights for the lidar point cloud. Pure math, no three.js.

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

export function terrainHeight(x: number, z: number) {
  let amp = 1;
  let freq = 0.055;
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    sum += amp * (valueNoise(x * freq + 13.7, z * freq - 4.2) - 0.5);
    amp *= 0.5;
    freq *= 2.05;
  }
  const ridge = Math.abs(valueNoise(x * 0.03 - 7, z * 0.03 + 3) - 0.5) * 2;
  const basin = Math.exp(-(x * x + z * z) / 220);
  return sum * 7.5 + (1 - ridge) * 2.2 - basin * 2.4;
}

export interface TerrainData {
  positions: Float32Array;
  randoms: Float32Array;
}

export function buildTerrain(size: number, segments: number): TerrainData {
  const count = segments * segments;
  const positions = new Float32Array(count * 3);
  const randoms = new Float32Array(count);
  const step = size / (segments - 1);
  const half = size / 2;
  let i = 0;
  for (let zi = 0; zi < segments; zi++) {
    for (let xi = 0; xi < segments; xi++) {
      const jitter = (hash(xi, zi) - 0.5) * step * 0.6;
      const x = xi * step - half + jitter;
      const z = zi * step - half + (hash(zi, xi) - 0.5) * step * 0.6;
      positions[i * 3] = x;
      positions[i * 3 + 1] = terrainHeight(x, z);
      positions[i * 3 + 2] = z;
      randoms[i] = hash(x * 3.1, z * 1.7);
      i++;
    }
  }
  return { positions, randoms };
}

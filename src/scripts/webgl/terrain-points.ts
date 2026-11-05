import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three';
import { buildTerrain } from './terrain';
import { RISE_GLSL } from './rise-layer';

/*
 * The dotted relief shared by every WebGL stage: reveal from the centre, sonar pings, the lidar and camera
 * footprints of the hero device, and the levelled pad (uSpot / uPad) under whatever stands on the ground.
 */

const POINT_VERT = /* glsl */ `
  attribute float aRand;
  attribute float aHole;
  uniform float uReveal;
  uniform float uRadius;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uRise;
  uniform float uPingStrength;
  uniform vec2 uPingCenter;
  uniform vec2 uPingAge;
  uniform vec3 uLidar;
  uniform vec4 uView;
  uniform float uFog;
  varying float vAlpha;
  varying float vHot;
  varying float vDist;
  varying float vLidar;

  ${RISE_GLSL}

  float ping(float d, float age) {
    float r = age * 9.0;
    float w = 0.7 + r * 0.04;
    return exp(-pow((d - r) / w, 2.0)) * (1.0 - smoothstep(4.0, 26.0, r)) * step(0.0, age);
  }

  void main() {
    vec3 p = settle(position);
    float revealed = 1.0 - smoothstep(uReveal * uRadius - 5.0, uReveal * uRadius, length(p.xz));

    float d = length(p.xz - uPingCenter) + p.y * 0.25;
    vDist = d;
    float hot = (ping(d, uPingAge.x) + ping(d, uPingAge.y)) * revealed * uPingStrength;

    /* Lidar returns: the swept sector glows and fades behind the beam, brightest on the channel rings. */
    vec2 rel = p.xz - uSpot.xz;
    float dist = length(rel);
    float lag = mod(uLidar.x - atan(rel.y, rel.x), 6.28318);
    float rings = smoothstep(0.6, 0.95, fract(dist / 1.1));
    float reach = smoothstep(uLidar.z * 0.08, uLidar.z * 0.16, dist) * (1.0 - smoothstep(uLidar.z * 0.6, uLidar.z, dist));
    float sweep = exp(-lag * 0.9) + exp(-lag * 8.0) * 1.5;
    float lidar = sweep * mix(0.25, 1.4, rings) * reach * uLidar.y * revealed;
    vLidar = lidar;
    hot += lidar;

    /* Camera field of view on the ground: dim wedge, crisp edges, a scan line sweeping outward. */
    float off = abs(mod(atan(rel.y, rel.x) - uView.x + 3.14159, 6.28318) - 3.14159);
    float inFov = 1.0 - smoothstep(0.24, 0.27, off);
    float depth = smoothstep(uView.w * 0.12, uView.w * 0.16, dist) * (1.0 - smoothstep(uView.w * 0.92, uView.w, dist));
    float rim = max(smoothstep(0.18, 0.25, off), smoothstep(uView.w * 0.8, uView.w * 0.95, dist));
    float scanLine = exp(-pow((dist - uView.z) / 0.5, 2.0));
    hot += inFov * depth * (0.18 + rim * 0.7 + scanLine * 0.9) * uView.y * revealed;

    float contour = smoothstep(0.08, 0.0, abs(fract(p.y * 0.9) - 0.5) - 0.42);
    p.y += hot * 0.5;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * uPixelRatio * (1.0 + hot * 1.6 + contour * 0.4) * (20.0 / -mv.z), 5.0 * uPixelRatio);

    float borrowed = step(0.5, aHole) * step(0.001, riseOf(aRand, aHole - 1.0, uRise));
    float fog = smoothstep(uFog, 10.0, -mv.z);
    float near = smoothstep(4.0, 14.0, -mv.z);
    vAlpha = revealed * fog * near * (0.32 + aRand * 0.4 + contour * 0.45 + hot * 1.4) * (1.0 - borrowed);
    vHot = hot;
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uBase;
  uniform vec3 uAccent;
  uniform vec3 uAccent2;
  varying float vAlpha;
  varying float vHot;
  varying float vDist;
  varying float vLidar;

  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.05, r);
    vec3 hotCol = mix(uAccent, uAccent2, max(smoothstep(4.0, 26.0, vDist), clamp(vLidar * 1.5, 0.0, 1.0)));
    vec3 col = mix(uBase, hotCol, clamp(vHot, 0.0, 0.85));
    gl_FragColor = vec4(col, vAlpha * soft * uOpacity);
  }
`;

export const TERRAIN_RADIUS = 34;

interface TerrainOptions {
  high: boolean;
  pixelRatio: number;
  colors: { base: Color; accent: Color; accent2: Color };
}

export function createTerrainPoints(o: TerrainOptions) {
  const terrain = buildTerrain(72, o.high ? 230 : 140);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(terrain.positions, 3));
  geo.setAttribute('aRand', new BufferAttribute(terrain.randoms, 1));
  const hole = new BufferAttribute(new Float32Array(terrain.randoms.length), 1);
  geo.setAttribute('aHole', hole);
  const uniforms = {
    uReveal: { value: 0 },
    uRise: { value: 0 },
    uPingStrength: { value: 1 },
    uPingCenter: { value: new Vector2(1e4, 1e4) },
    uPingAge: { value: new Vector2(-1, -1) },
    uSpot: { value: new Vector3(0, -100, 0) },
    uPad: { value: new Vector2(0, 0) },
    uLidar: { value: new Vector3(0, 0, 1) },
    uView: { value: new Vector4(0, 0, 0, 1) },
    uGrow: { value: 0 },
    uRadius: { value: TERRAIN_RADIUS },
    uFog: { value: 70 },
    uSize: { value: o.high ? 2.1 : 2.6 },
    uPixelRatio: { value: o.pixelRatio },
    uOpacity: { value: 1 },
    uBase: { value: o.colors.base },
    uAccent: { value: o.colors.accent },
    uAccent2: { value: o.colors.accent2 },
  };
  const points = new Points(
    geo,
    new ShaderMaterial({
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  return { points, uniforms, terrain, hole };
}

/* Same easing the relief uses when it grows in on load. */
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

import { Color, CubicBezierCurve3, CurvePath, LineCurve3, QuadraticBezierCurve3, Scene, Vector3 } from 'three';
import { createCloud, createFlash, createLaunchPad, createTrail } from './flight';

/*
 * One intercept, built from points: the interceptor waits nose-up on its pad, a Shahed-type drone flies in
 * on a straight line, the interceptor climbs and curves onto it, and both burst apart at the impact point.
 * Callers drive it with `set` (all 0-1) and render with `update`.
 */

export interface InterceptState {
  /* The interceptor assembling on its pad. */
  ready: number;
  /* Progress of the drone along its path; 1 is the impact point. */
  threat: number;
  /* Progress of the interceptor along its climb; 1 is the impact point. */
  launch: number;
  /* Impact burst. */
  burst: number;
}

interface InterceptOptions {
  scene: Scene;
  high: boolean;
  pixelRatio: number;
  colors: { base: Color; blue: Color; pink: Color };
  /* Ground point under the interceptor. */
  pad: Vector3;
  /* Where the drone enters and where it is hit. */
  from: Vector3;
  impact: Vector3;
  interceptorScale?: number;
  threatScale?: number;
  fog?: number;
  /* Ground height around the pad, so the launch pad stands on the relief. */
  groundAt?: (x: number, z: number) => number;
  /*
   * The point radar sends the interceptor to. It flies there first, then its AI camera takes it on to the
   * drone; it reaches the waypoint at `launch` = WAYPOINT_AT.
   */
  waypoint?: Vector3;
}

export const WAYPOINT_AT = 0.6;

const tmp = new Vector3();
const tan = new Vector3();

export function createIntercept(o: InterceptOptions) {
  const iScale = o.interceptorScale ?? 0.8;
  const tScale = o.threatScale ?? 1.25;
  const red = new Color('#ff4f7a');
  const cyan = new Color('#5fd4ff');

  const interceptor = createCloud({
    scene: o.scene,
    shape: 'interceptorAir',
    count: o.high ? 2600 : 1400,
    scale: iScale,
    pixelRatio: o.pixelRatio,
    colors: { base: new Color('#e6f6ff'), a: cyan, b: o.colors.blue },
    size: 1.8,
    fog: o.fog,
  });
  const threat = createCloud({
    scene: o.scene,
    shape: 'shahed',
    count: o.high ? 2400 : 1300,
    scale: tScale,
    pixelRatio: o.pixelRatio,
    colors: { base: new Color('#ffd0dc'), a: red, b: new Color('#ff8a5c') },
    size: 1.7,
    fog: o.fog,
    seed: 7,
    spinAxis: 'x',
  });

  const launchPad = createLaunchPad({
    scene: o.scene,
    at: o.pad,
    size: iScale * 0.55,
    groundAt: o.groundAt ?? (() => o.pad.y),
    pixelRatio: o.pixelRatio,
    colors: { base: o.colors.base, accent: cyan },
    high: o.high,
    fog: o.fog,
  });
  const padTop = new Vector3(o.pad.x, launchPad.top + iScale * 0.99, o.pad.z);
  const climbTop = padTop.clone().add(new Vector3(0, Math.max(3, (o.impact.y - padTop.y) * 0.55), 0));
  const end = o.waypoint ?? o.impact;
  const toEnd = new CubicBezierCurve3(padTop, climbTop, climbTop.clone().lerp(end, 0.55), end.clone());
  const climb = new CurvePath<Vector3>();
  climb.add(toEnd);
  if (o.waypoint) {
    const onward = o.waypoint.clone().sub(climbTop.clone().lerp(o.waypoint, 0.55)).normalize();
    const reach = o.waypoint.distanceTo(o.impact) * 0.45;
    climb.add(new QuadraticBezierCurve3(o.waypoint.clone(), o.waypoint.clone().addScaledVector(onward, reach), o.impact.clone()));
  }
  /* Share of the whole path at which the waypoint sits. */
  const waypointK = o.waypoint ? toEnd.getLength() / climb.getLength() : 1;
  /* Accelerates off the pad, reaches the waypoint at WAYPOINT_AT, then the AI run to the drone. */
  const along = (launch: number) => {
    if (!o.waypoint) return Math.pow(launch, 1.5);
    if (launch < WAYPOINT_AT) return waypointK * Math.pow(launch / WAYPOINT_AT, 1.3);
    return waypointK + (1 - waypointK) * ((launch - WAYPOINT_AT) / (1 - WAYPOINT_AT));
  };
  const approach = new LineCurve3(o.from.clone(), o.impact.clone());
  const heading = o.impact.clone().sub(o.from).normalize();

  const climbTrail = createTrail({
    scene: o.scene,
    curve: climb,
    count: o.high ? 900 : 500,
    pixelRatio: o.pixelRatio,
    color: cyan,
    size: 2.4,
    length: 0.5,
  });
  const threatTrail = createTrail({
    scene: o.scene,
    curve: approach,
    count: o.high ? 700 : 400,
    pixelRatio: o.pixelRatio,
    color: red,
    size: 2,
    length: 0.22,
  });
  const flash = createFlash({ scene: o.scene, at: o.impact, pixelRatio: o.pixelRatio, radius: 3.2, count: o.high ? 320 : 180 });

  const state: InterceptState = { ready: 0, threat: 0, launch: 0, burst: 0 };
  /* Where both aircraft are this frame, for screen overlays. */
  const interceptorAt = padTop.clone();
  const threatAt = o.from.clone();

  function set(s: Partial<InterceptState>) {
    Object.assign(state, s);
  }

  function update(time: number, opacity: number) {
    const { ready, launch, burst } = state;
    const t = state.threat;

    if (launch <= 0) {
      interceptor.place(padTop, undefined);
      interceptorAt.copy(padTop);
    } else {
      const k = along(launch);
      climb.getPoint(k, tmp);
      climb.getTangent(Math.min(k, 0.999), tan);
      interceptor.place(tmp, tan, 'up');
      interceptorAt.copy(tmp);
    }
    approach.getPoint(t, tmp);
    threat.place(tmp, heading, 'x');
    threatAt.copy(tmp);

    /* Rotors idle on the pad and run at full speed once it launches. */
    interceptor.update(time, ready, burst, opacity, 7 + Math.min(1, launch * 8) * 38);
    threat.update(time, Math.min(1, t * 6), burst, opacity, 30);
    climbTrail.update(time, along(launch), opacity * (1 - burst));
    threatTrail.update(time, t, opacity * 0.8 * (1 - burst));
    flash.update(burst * 1.25, opacity);
    launchPad.update(time, ready, Math.min(1, launch * 5), opacity);
  }

  return { set, update, state, impact: o.impact.clone(), padTop, interceptorAt, threatAt, waypoint: end.clone() };
}

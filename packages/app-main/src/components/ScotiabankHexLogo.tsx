"use client";

import { useEffect, useRef, useCallback, useReducer } from "react";

// ─── Animation timing constants ───
const BASE_DUR_NO_CRUISE = 3550;
const CRUISE_PER_SPIN = Math.round((360 / 823) * 1000); // ~437ms per spin at peak velocity
function getBaseDur(extraSpins: number) {
  return BASE_DUR_NO_CRUISE + extraSpins * CRUISE_PER_SPIN;
}

const CX = 106.5;
const CY = 118.5;
const PEAK_V = 823;

// ─── Easing functions ───
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}
function smoothstep(t: number) {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}
function easeInOut3(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOut2(t: number) {
  return 1 - (1 - t) * (1 - t);
}
function easeOut3(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
function easeIn2(t: number) {
  return t * t;
}
function despawnOp(t: number) {
  const c = clamp01(t);
  if (c < 0.667) return 1.0;
  return 1.0 - smoothstep((c - 0.667) / 0.333);
}
function bounceSweep(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const base = easeInOut3(t);
  const bump = Math.sin(t * Math.PI) * 0.06 * (1 - t * t);
  return base + bump;
}
function bounceBack(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const decay = Math.pow(2, -7 * t);
  return 1 - decay * Math.cos(t * Math.PI * 2.2);
}

// ─── Config defaults ───
const SPIN_SCALE = 0.78;
const SPIN_INSET = 0.89;
const PAUSE_MS = 100;
const CONTRACT_PCT = 0.60;
const STROKE_COLOR = "#800000";
const STROKE_THICK = 1.5;

function getSpinEnvelope(ms: number, contractPct: number, extraSpins: number) {
  const cD = extraSpins * CRUISE_PER_SPIN;
  const BD = getBaseDur(extraSpins);
  const t = Math.min(ms, BD);
  if (t < 500) return 0;
  const rampInMs = Math.max(1, 1400 * contractPct);
  if (t < 500 + rampInMs) return smoothstep((t - 500) / rampInMs);
  if (t < 2400 + cD) return 1;
  if (t < 2600 + cD) return 1 - smoothstep((t - 2400 - cD) / 200);
  return 0;
}

interface PairState {
  rot: number;
  op: number;
  blur: number;
}

interface AnimState {
  pA: PairState;
  pB: PairState;
  pC: PairState;
  morph: { ext: number; tip: number; bw: number };
  gs: number;
  glow: number;
  spinEnv: number;
  strokeW: number;
  wingGlow: number;
  warpAmt: number;
}

function getState(ms: number, extraSpins: number): AnimState {
  const spinInset = SPIN_INSET;
  const contractPct = CONTRACT_PCT;
  const pauseMs = PAUSE_MS;
  const cD = extraSpins * CRUISE_PER_SPIN;
  const eR = extraSpins * 360;
  const BD = getBaseDur(extraSpins);

  let pA: PairState = { rot: 0, op: 1, blur: 0 };
  let pB: PairState = { rot: 0, op: 0, blur: 6 };
  let pC: PairState = { rot: 0, op: 0, blur: 6 };
  let morph = { ext: 1, tip: 0, bw: 1 };
  let gs = 1.0;
  let glow = 0;
  let strokeW = 0;
  let wingGlow = 0;
  let warpAmt = 0;

  const spinExt = lerp(1.0, spinInset, 1);
  const spinBw = lerp(1.0, spinInset + 0.05, 1);
  const spinTip = spinInset < 0.5 ? 10 * (1 - spinInset) * 2 : 0;

  // PAUSE at START
  if (ms < pauseMs) {
    return { pA, pB, pC, morph, gs: 1, glow: 0, spinEnv: 0, strokeW: 0, wingGlow: 0, warpAmt: 0 };
  }

  const t = ms - pauseMs;

  // ─── PHASE 1: SPAWN B (0→250) ───
  if (t < 250) {
    const p = easeInOut3(t / 250);
    pB = { rot: lerp(0, -60, p), op: 1, blur: lerp(6, 0, easeOut3(t / 250)) };
    glow = lerp(0, 0.08, p);
    strokeW = t < 150 ? 0 : lerp(0, 1.5, smoothstep((t - 150) / 100));
  }
  // ─── PHASE 2: SPAWN C (250→500) ───
  else if (t < 500) {
    const p = easeInOut3((t - 250) / 250);
    pB = { rot: -60, op: 1, blur: 0 };
    pC = { rot: lerp(-60, -120, p), op: 1, blur: lerp(6, 0, easeOut3((t - 250) / 250)) };
    glow = lerp(0.08, 0.12, p);
    strokeW = 1.5;
  }
  // ─── PHASE 3: ACCEL SPIN (500→1900) ───
  else if (t < 1900) {
    const local = (t - 500) / 1400;
    const spin = -720 * Math.pow(local, 1.6);
    const contractDur = Math.max(1, 1400 * contractPct);
    const rampIn = smoothstep(clamp01((t - 500) / contractDur));
    morph = { ext: lerp(1, spinExt, rampIn), tip: lerp(0, spinTip, rampIn), bw: lerp(1, spinBw, rampIn) };
    gs = lerp(1, 1 + (1 - spinInset) * 0.04, rampIn);
    const vel = (720 * 1.6 * Math.pow(local, 0.6)) / 1.4;
    const velNorm = vel / PEAK_V;
    const blur = 3.5 * velNorm;
    pA = { rot: spin, op: 1, blur };
    pB = { rot: -60 + spin, op: 1, blur };
    pC = { rot: -120 + spin, op: 1, blur };
    glow = lerp(0.12, 0.5, local);
    strokeW = 1.5;
    warpAmt = velNorm * smoothstep(rampIn);
  }
  // ─── PHASE 3.5: CRUISE (1900→1900+cD) ───
  else if (cD > 0 && t < 1900 + cD) {
    const local = (t - 1900) / cD;
    const spin = -720 - eR * local;
    morph = { ext: spinExt, tip: spinTip, bw: spinBw };
    gs = 1 + (1 - spinInset) * 0.04;
    const blur = 3.5;
    pA = { rot: spin, op: 1, blur };
    pB = { rot: -60 + spin, op: 1, blur };
    pC = { rot: -120 + spin, op: 1, blur };
    glow = 0.5;
    strokeW = 1.5;
    warpAmt = 1;
  }
  // ─── PHASE 4: DECEL SPIN (1900+cD→2600+cD) ───
  else if (t < 2600 + cD) {
    const local = (t - 1900 - cD) / 700;
    const decel = 1.6 * local - 0.2 * local * local - 0.4 * local * local * local;
    const spin = -(720 + eR) - 360 * decel;
    const eT = smoothstep(local);
    morph = { ext: lerp(spinExt, 1.0, eT), tip: lerp(spinTip, 0, eT), bw: lerp(spinBw, 1.0, eT) };
    gs = lerp(1 + (1 - spinInset) * 0.04, 1.0, eT);
    const vel = (360 * (1.6 - 0.4 * local - 1.2 * local * local)) / 0.7;
    const velNorm = vel / PEAK_V;
    const blur = 3.5 * velNorm;
    pA = { rot: spin, op: 1, blur };
    pB = { rot: -60 + spin, op: 1, blur };
    pC = { rot: -120 + spin, op: 1, blur };
    glow = lerp(0.5, 0.15, local);
    strokeW = 1.5;
    warpAmt = velNorm;
  }
  // ─── PHASE 5: OVERSHOOT (2600+cD→2800+cD) ───
  else if (t < 2800 + cD) {
    const local = (t - 2600 - cD) / 200;
    const eased = easeOut2(local);
    const spin = -(1080 + eR) - 20 * eased;
    morph = { ext: lerp(1.0, 1.05, eased), tip: lerp(0, -5, eased), bw: lerp(1.0, 1.02, eased) };
    glow = lerp(0.15, 0.08, local);
    pA = { rot: spin, op: 1, blur: 0 };
    pB = { rot: -60 + spin, op: 1, blur: 0 };
    pC = { rot: -120 + spin, op: 1, blur: 0 };
    strokeW = 1.5;
    warpAmt = lerp(0.08, 0, easeOut2(local));
  }
  // ─── PHASE 6: ALL BOUNCE BACK (2800+cD→3050+cD) ───
  else if (t < 3050 + cD) {
    const local = (t - 2800 - cD) / 250;
    const spring = bounceBack(local);
    pA = { rot: lerp(-(1100 + eR), -(1080 + eR), spring), op: 1, blur: 0 };
    pB = { rot: lerp(-(1160 + eR), -(1140 + eR), spring), op: 1, blur: 0 };
    pC = { rot: lerp(-(1220 + eR), -(1200 + eR), spring), op: 1, blur: 0 };
    const mS = smoothstep(local);
    morph = { ext: lerp(1.05, 1.0, mS), tip: lerp(-5, 0, mS), bw: lerp(1.02, 1.0, mS) };
    glow = lerp(0.08, 0, local);
    strokeW = 1.5;
  }
  // ─── PHASE 7: DESPAWN C (3050+cD→3300+cD) ───
  else if (t < 3300 + cD) {
    const local = (t - 3050 - cD) / 250;
    const sweep = bounceSweep(local);
    pA = { rot: -(1080 + eR), op: 1, blur: 0 };
    pC = { rot: lerp(-(1200 + eR), -(1260 + eR), sweep), op: despawnOp(local), blur: lerp(0, 5, easeIn2(local)) };
    pB = { rot: lerp(-(1140 + eR), -(1200 + eR), sweep), op: 1, blur: 0 };
    morph = { ext: 1, tip: 0, bw: 1 };
    strokeW = 1.5;
  }
  // ─── PHASE 8: DESPAWN B (3300+cD→3550+cD) ───
  else {
    const local = clamp01((t - 3300 - cD) / 250);
    const sweep = bounceSweep(local);
    pA = { rot: -(1080 + eR), op: 1, blur: 0 };
    pB = { rot: lerp(-(1200 + eR), -(1260 + eR), sweep), op: despawnOp(local), blur: lerp(0, 5, easeIn2(local)) };
    pC = { rot: -(1260 + eR), op: 0, blur: 5 };
    morph = { ext: 1, tip: 0, bw: 1 };
    strokeW = lerp(1.5, 0, smoothstep(local));
  }

  // Wing glow
  wingGlow =
    t < 500
      ? smoothstep(t / 500)
      : t > BD - 200
        ? 1 - smoothstep((t - (BD - 200)) / 200)
        : 1;

  return {
    pA,
    pB,
    pC,
    morph,
    gs,
    glow,
    spinEnv: getSpinEnvelope(t, contractPct, extraSpins),
    strokeW,
    wingGlow,
    warpAmt,
  };
}

// ─── Wing path builders ───
function buildTopWing(ext: number, tipBend: number, bodyW: number, warp: number) {
  const br = (tipBend * Math.PI) / 180;
  const cb = Math.cos(br);
  const sb = Math.sin(br);
  const m = (ext + bodyW) / 2;
  const f = (n: number) => n.toFixed(2);
  const w = warp;

  const mx = (404.9 + w * 14).toFixed(2);
  const my = (94.79 - w * 6).toFixed(2);
  const s5dx = 92.19 * ext;
  const s5dy = 0.29 * ext;
  const tp = [
    { x: -1, y: 1.12 },
    { x: -39, y: 44 },
    { x: -39, y: 44 },
  ].map((p) => ({ x: p.x * ext * cb - p.y * ext * sb, y: p.x * ext * sb + p.y * ext * cb }));

  return `M${mx},${my}s${f(-8.72 * bodyW)},${f(-16.36 * bodyW)},${f(-8.72 * bodyW)},${f(-34.29 * bodyW)}c0,${f(-33.17 * m)},${f(25.37 * m)},${f(-57.36 * m)},${f(42.28 * m)},${f(-65.59 * m)},${f(17.43 * ext)},${f(-7.22 * ext)},${f(35.06 * ext)},${f(-6.84 * ext)},${f(53.59 * ext)},${f(-6.72 * ext)},0,0,${f(77.52 * ext)},${f(0.23 * ext)},${f(s5dx)},${f(s5dy)}${f(tp[0].x)},${f(tp[0].y)},${f(tp[1].x)},${f(tp[1].y)},${f(tp[2].x)},${f(tp[2].y)}L${lerp(470, 489, ext).toFixed(1)},${lerp(65, 32.5, ext).toFixed(1)}c${f(-31.86 * bodyW)},${f(1.4 * bodyW)},${f(-47.9 * bodyW)},${f(1 * bodyW)},${f(-66.84 * bodyW)},${f(24.54 * bodyW)}C${f(lerp(430, 412.93, bodyW) + w * 14)},${f(lerp(88, 67.56, bodyW) - w * 6)},${f(lerp(420, 408.3, bodyW) + w * 14)},${f(lerp(91, 80.51, bodyW) - w * 6)},${mx},${my}Z`;
}

function buildBottomWing(ext: number, tipBend: number, bodyW: number, warp: number) {
  const br = (tipBend * Math.PI) / 180;
  const cb = Math.cos(br);
  const sb = Math.sin(br);
  const m = (ext + bodyW) / 2;
  const f = (n: number) => n.toFixed(2);
  const w = warp;

  const mx = (550.58 - w * 14).toFixed(2);
  const my = (118.5 + w * 6).toFixed(2);
  const s5dx = -92.18 * ext;
  const s5dy = -0.29 * ext;
  const tp = [
    { x: 0.95, y: -1.11 },
    { x: 39, y: -44 },
    { x: 39, y: -44 },
  ].map((p) => ({ x: p.x * ext * cb - p.y * ext * sb, y: p.x * ext * sb + p.y * ext * cb }));

  return `M${mx},${my}s${f(8.71 * bodyW)},${f(16.37 * bodyW)},${f(8.71 * bodyW)},${f(34.29 * bodyW)}c0,${f(33.18 * m)},${f(-25.37 * m)},${f(57.36 * m)},${f(-42.28 * m)},${f(65.59 * m)},${f(-17.43 * ext)},${f(7.22 * ext)},${f(-35.06 * ext)},${f(6.84 * ext)},${f(-53.59 * ext)},${f(6.72 * ext)},0,0,${f(-77.52 * ext)},${f(-0.22 * ext)},${f(s5dx)},${f(s5dy)}${f(tp[0].x)},${f(tp[0].y)},${f(tp[1].x)},${f(tp[1].y)},${f(tp[2].x)},${f(tp[2].y)}l${f(56.23 * ext)},0c${f(31.86 * bodyW)},${f(-1.39 * bodyW)},${f(47.89 * bodyW)},${f(-1 * bodyW)},${f(66.84 * bodyW)},${f(-24.53 * bodyW)}C${f(lerp(525, 542.54, bodyW) - w * 14)},${f(lerp(125, 145.74, bodyW) + w * 6)},${f(lerp(535, 547.17, bodyW) - w * 14)},${f(lerp(122, 132.78, bodyW) + w * 6)},${mx},${my}Z`;
}

interface WingPairProps {
  rotation: number;
  opacity: number;
  blur: number;
  topPath: string;
  botPath: string;
  fill: string;
  id: string;
  scaleVal: number;
  wingGlow: number;
  strokeW: number;
  strokeColor: string;
}

function WingPair({ rotation, opacity, blur, topPath, botPath, fill, id, scaleVal, wingGlow, strokeW, strokeColor }: WingPairProps) {
  if (opacity < 0.003) return null;
  const needsScale = scaleVal < 0.999;
  const hasGlow = wingGlow > 0.01;
  const hasStroke = strokeW > 0.01;

  const inner = (
    <g transform="translate(-371.24 11.85)">
      {hasGlow && (
        <>
          <path d={topPath} fill="#ff4444" opacity={wingGlow * 0.4} filter="url(#wingGlowFilter)" />
          <path d={botPath} fill="#ff4444" opacity={wingGlow * 0.4} filter="url(#wingGlowFilter)" />
        </>
      )}
      <path d={topPath} fill={fill} />
      <path d={botPath} fill={fill} />
      {hasStroke && (
        <>
          <defs>
            <clipPath id={`clip-top-${id}`}>
              <path d={topPath} />
            </clipPath>
            <clipPath id={`clip-bot-${id}`}>
              <path d={botPath} />
            </clipPath>
          </defs>
          <path
            d={topPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeW * 2}
            clipPath={`url(#clip-top-${id})`}
          />
          <path
            d={botPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeW * 2}
            clipPath={`url(#clip-bot-${id})`}
          />
        </>
      )}
    </g>
  );

  return (
    <g
      transform={`rotate(${rotation}, ${CX}, ${CY})`}
      opacity={opacity}
      filter={blur > 0.15 ? `url(#blur-${id})` : undefined}
    >
      {needsScale ? (
        <g transform={`translate(${CX},${CY}) scale(${scaleVal}) translate(${-CX},${-CY})`}>{inner}</g>
      ) : (
        inner
      )}
    </g>
  );
}

type AnimMode = "idle" | "spinning" | "finishing";

interface ScotiabankHexLogoProps {
  loading?: boolean;
}

/** Scotiabank hex logo — static when idle, spinning loading indicator when loading=true */
export function ScotiabankHexLogo({ loading = false }: ScotiabankHexLogoProps) {
  const modeRef = useRef<AnimMode>("idle");
  const animTimeRef = useRef(0);
  const extraSpinsRef = useRef(0);
  const hasAnimatedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  const tick = useCallback((ts: number) => {
    if (lastTsRef.current === null) lastTsRef.current = ts;
    const dt = ts - lastTsRef.current;
    lastTsRef.current = ts;

    animTimeRef.current += dt;

    const totalAnimDur = PAUSE_MS + getBaseDur(extraSpinsRef.current);

    // Check if finishing animation is complete
    if (modeRef.current === "finishing" && animTimeRef.current >= totalAnimDur) {
      modeRef.current = "idle";
      animTimeRef.current = 0;
      rafRef.current = null;
      lastTsRef.current = null;
      forceRender();
      return;
    }

    forceRender();
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Handle loading transitions
  useEffect(() => {
    if (loading) {
      // false → true: start spinning
      if (modeRef.current === "idle") {
        modeRef.current = "spinning";
        animTimeRef.current = 0;
        extraSpinsRef.current = 999;
        hasAnimatedRef.current = true;
        lastTsRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
      } else if (modeRef.current === "finishing") {
        // Was winding down, resume spinning
        modeRef.current = "spinning";
        extraSpinsRef.current = 999;
      }
    } else {
      // true → false: wind down
      if (modeRef.current === "spinning") {
        const t = animTimeRef.current - PAUSE_MS;
        if (t >= 1900) {
          // In cruise — finish current spin + 1
          const cruiseTime = t - 1900;
          const completedSpins = Math.floor(cruiseTime / CRUISE_PER_SPIN);
          extraSpinsRef.current = completedSpins + 1;
        } else {
          // Still in spawn/accel — let decel play out with 0 extra spins
          extraSpinsRef.current = 0;
        }
        modeRef.current = "finishing";
      }
    }
  }, [loading, tick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Compute render state
  const isAnimating = modeRef.current !== "idle";
  const s = isAnimating
    ? getState(animTimeRef.current, extraSpinsRef.current)
    : getState(0, 0);

  const effectiveWarp = s.warpAmt;
  const topP = buildTopWing(s.morph.ext, s.morph.tip, s.morph.bw, effectiveWarp);
  const botP = buildBottomWing(s.morph.ext, s.morph.tip, s.morph.bw, effectiveWarp);
  const globeR = 59.75 * s.gs;
  const glowPx = s.glow * 22;
  const effectiveScale = lerp(1.0, SPIN_SCALE, s.spinEnv);
  const effectiveStrokeW = s.strokeW * (STROKE_THICK / 1.5);

  const origFill = "#ec121f";
  const ghostFill = "#ec121f";
  const rr = Math.min(255, Math.round(236 + s.glow * 20));
  const gg = Math.min(55, Math.round(18 + s.glow * 30));
  const bb = Math.min(55, Math.round(31 + s.glow * 18));

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible">
      {s.glow > 0.03 && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(236,18,31,${s.glow * 0.18}) 0%, transparent 55%)`,
            transform: "scale(3)",
            filter: `blur(${s.glow * 45}px)`,
          }}
        />
      )}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-50 -50 313 337"
        className="w-full h-full overflow-visible"
        style={{
          filter: glowPx > 0.3 ? `drop-shadow(0 0 ${glowPx}px rgba(236,18,31,${s.glow * 0.55}))` : "none",
        }}
      >
        <defs>
          <filter id="blur-A">
            <feGaussianBlur stdDeviation={Math.max(0, s.pA.blur * 0.6)} />
          </filter>
          <filter id="blur-B">
            <feGaussianBlur stdDeviation={Math.max(0, s.pB.blur * 0.6)} />
          </filter>
          <filter id="blur-C">
            <feGaussianBlur stdDeviation={Math.max(0, s.pC.blur * 0.6)} />
          </filter>
          <filter id="wingGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <radialGradient id="gg5" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={`rgb(${Math.min(255, rr + 8)},${Math.min(70, gg + 18)},${Math.min(70, bb + 8)})`}
              stopOpacity={s.glow > 0.1 ? 1 : 0}
            />
            <stop offset="100%" stopColor={s.glow > 0.1 ? `rgb(${rr},${gg},${bb})` : origFill} />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={globeR} fill={s.glow > 0.1 ? "url(#gg5)" : origFill} />
        <WingPair
          rotation={s.pC.rot}
          opacity={s.pC.op}
          blur={s.pC.blur}
          topPath={topP}
          botPath={botP}
          fill={ghostFill}
          id="C"
          scaleVal={effectiveScale}
          wingGlow={s.wingGlow}
          strokeW={effectiveStrokeW}
          strokeColor={STROKE_COLOR}
        />
        <WingPair
          rotation={s.pB.rot}
          opacity={s.pB.op}
          blur={s.pB.blur}
          topPath={topP}
          botPath={botP}
          fill={ghostFill}
          id="B"
          scaleVal={effectiveScale}
          wingGlow={s.wingGlow}
          strokeW={effectiveStrokeW}
          strokeColor={STROKE_COLOR}
        />
        <WingPair
          rotation={s.pA.rot}
          opacity={s.pA.op}
          blur={s.pA.blur}
          topPath={topP}
          botPath={botP}
          fill={origFill}
          id="A"
          scaleVal={effectiveScale}
          wingGlow={s.wingGlow}
          strokeW={effectiveStrokeW}
          strokeColor={STROKE_COLOR}
        />
      </svg>
    </div>
  );
}

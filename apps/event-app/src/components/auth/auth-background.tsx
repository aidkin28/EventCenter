"use client";

import { useEffect, useRef, useMemo, useState } from "react";

interface ThreadDef {
  pts: number[];
  sg: number; sw: number; op: number;
  dr: number; dg: number; dd: number;
}

const VB_W = 1440;
const VB_H = 800;
const CENTER_Y = 400;

const DOT_PHASES = Array.from({ length: 36 }, (_, i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
});

const RAW_THREADS: ThreadDef[] = [
  { pts: [50,720, 200,590, 350,540, 500,490, 650,520, 800,550, 950,460, 1100,370, 1200,340], sg:1, sw:0.8, op:0.8, dr:2, dg:1, dd:4 },
  { pts: [80,730, 250,620, 400,570, 550,520, 700,550, 850,580, 1000,490, 1150,400, 1300,370], sg:2, sw:1.5, op:0.7, dr:3, dg:2, dd:5 },
  { pts: [20,710, 180,580, 320,530, 460,480, 600,510, 740,540, 880,450, 1020,360, 1200,330], sg:3, sw:1.2, op:0.8, dr:2.5, dg:1, dd:4.5 },
  { pts: [120,740, 280,640, 450,590, 620,540, 770,570, 920,600, 1070,510, 1220,420, 1350,390], sg:1, sw:0.6, op:0.6, dr:1.5, dg:3, dd:5.5 },
  { pts: [60,725, 220,600, 380,550, 540,500, 680,530, 820,560, 960,470, 1100,380, 1280,350], sg:2, sw:1.0, op:0.7, dr:2.2, dg:2, dd:4.2 },
  { pts: [150,735, 300,660, 480,610, 660,560, 800,590, 940,620, 1080,530, 1220,440, 1400,410], sg:3, sw:1.3, op:0.6, dr:2.8, dg:1, dd:5.2 },
  { pts: [40,715, 190,585, 340,535, 490,485, 630,515, 770,545, 910,455, 1050,365, 1250,335], sg:1, sw:0.9, op:0.8, dr:2, dg:3, dd:4.8 },
  { pts: [100,728, 260,630, 420,580, 580,530, 720,560, 860,590, 1000,500, 1140,410, 1320,380], sg:2, sw:1.4, op:0.7, dr:3, dg:2, dd:5.8 },
  { pts: [30,722, 170,595, 310,545, 450,495, 590,525, 730,555, 870,465, 1010,375, 1180,345], sg:3, sw:0.5, op:0.6, dr:1.2, dg:1, dd:6 },
  { pts: [90,732, 240,625, 390,575, 540,525, 680,555, 820,585, 960,495, 1100,405, 1300,375], sg:1, sw:1.1, op:0.8, dr:2.5, dg:3, dd:4.3 },
  { pts: [70,727, 210,605, 360,555, 510,505, 650,535, 790,565, 930,475, 1070,385, 1260,355], sg:2, sw:0.4, op:0.5, dr:1, dg:2, dd:5.7 },
  { pts: [110,738, 270,645, 430,595, 590,545, 730,575, 870,605, 1010,515, 1150,425, 1380,395], sg:3, sw:1.5, op:0.7, dr:3.2, dg:1, dd:4.7 },
  { pts: [45,718, 185,588, 325,538, 465,488, 605,518, 745,548, 885,458, 1025,368, 1220,338], sg:1, sw:0.7, op:0.6, dr:1.8, dg:3, dd:5.3 },
  { pts: [130,721, 290,630, 460,580, 630,530, 770,560, 910,590, 1050,500, 1190,410, 1350,380], sg:2, sw:1.0, op:0.8, dr:2.3, dg:2, dd:4.9 },
  { pts: [25,713, 165,583, 305,533, 445,483, 585,513, 725,543, 865,453, 1005,363, 1200,333], sg:3, sw:0.3, op:0.4, dr:0.8, dg:1, dd:6.2 },
  { pts: [85,719, 235,605, 385,555, 535,505, 675,535, 815,565, 955,475, 1095,385, 1320,355], sg:1, sw:1.5, op:0.9, dr:3.2, dg:2, dd:4.1 },
  { pts: [50,720, 180,660, 320,620, 460,580, 600,600, 740,620, 880,560, 1020,500, 1200,340], sg:2, sw:0.6, op:0.5, dr:1.5, dg:1, dd:5.1 },
  { pts: [50,720, 200,680, 350,640, 500,600, 650,620, 800,640, 950,580, 1100,520, 1200,340], sg:3, sw:1.2, op:0.7, dr:2.8, dg:2, dd:4.6 },
  { pts: [50,720, 160,670, 280,630, 400,590, 540,610, 680,630, 820,570, 960,510, 1200,340], sg:1, sw:0.8, op:0.6, dr:2, dg:3, dd:5.4 },
  { pts: [50,720, 220,690, 380,650, 540,610, 680,630, 820,650, 960,590, 1100,530, 1200,340], sg:2, sw:1.4, op:0.8, dr:3, dg:1, dd:4.4 },
  { pts: [50,720, 170,675, 300,635, 430,595, 570,615, 710,635, 850,575, 990,515, 1200,340], sg:3, sw:0.5, op:0.4, dr:1.2, dg:2, dd:5.9 },
  { pts: [50,720, 190,745, 340,705, 490,665, 630,685, 770,705, 910,645, 1050,585, 1200,340], sg:1, sw:1.1, op:0.7, dr:2.5, dg:3, dd:4.8 },
  { pts: [50,720, 150,725, 270,685, 390,645, 530,665, 670,685, 810,625, 950,565, 1200,340], sg:2, sw:0.9, op:0.6, dr:2.2, dg:1, dd:5.2 },
  { pts: [50,720, 210,755, 370,715, 530,675, 670,695, 810,715, 950,655, 1090,595, 1200,340], sg:3, sw:1.3, op:0.8, dr:2.9, dg:2, dd:4.2 },
  { pts: [50,720, 165,730, 290,690, 415,650, 555,670, 695,690, 835,630, 975,570, 1200,340], sg:1, sw:0.7, op:0.5, dr:1.8, dg:3, dd:5.6 },
  { pts: [50,720, 230,760, 390,720, 550,680, 690,700, 830,720, 970,660, 1110,600, 1200,340], sg:2, sw:1.0, op:0.7, dr:2.4, dg:1, dd:4.7 },
  { pts: [50,720, 175,740, 310,700, 445,660, 585,680, 725,700, 865,640, 1005,580, 1200,340], sg:3, sw:0.4, op:0.4, dr:1, dg:2, dd:6.1 },
  { pts: [50,720, 195,750, 350,710, 505,670, 645,690, 785,710, 925,650, 1065,590, 1200,340], sg:1, sw:1.5, op:0.9, dr:3.1, dg:3, dd:4.3 },
  { pts: [50,720, 155,735, 285,695, 415,655, 555,675, 695,695, 835,635, 975,575, 1200,340], sg:2, sw:0.8, op:0.6, dr:2, dg:1, dd:5.3 },
  { pts: [50,720, 215,765, 375,725, 535,685, 675,705, 815,725, 955,665, 1095,605, 1200,340], sg:3, sw:1.2, op:0.8, dr:2.7, dg:2, dd:4.5 },
  { pts: [50,720, 185,745, 325,705, 465,665, 605,685, 745,705, 885,645, 1025,585, 1200,340], sg:1, sw:0.6, op:0.5, dr:1.5, dg:3, dd:5.8 },
  { pts: [50,720, 205,755, 365,715, 525,675, 665,695, 805,715, 945,655, 1085,595, 1200,340], sg:2, sw:1.4, op:0.8, dr:3, dg:1, dd:4.1 },
  { pts: [50,720, 160,730, 295,690, 430,650, 570,670, 710,690, 850,630, 990,570, 1200,340], sg:3, sw:0.9, op:0.6, dr:2.1, dg:2, dd:5.1 },
  { pts: [50,720, 225,770, 385,730, 545,690, 685,710, 825,730, 965,670, 1105,610, 1200,340], sg:1, sw:1.1, op:0.7, dr:2.6, dg:3, dd:4.9 },
  { pts: [50,720, 170,740, 305,700, 440,660, 580,680, 720,700, 860,640, 1000,580, 1200,340], sg:2, sw:0.3, op:0.4, dr:0.8, dg:1, dd:6.3 },
  { pts: [50,720, 240,715, 400,675, 560,635, 700,655, 840,675, 980,615, 1120,555, 1200,340], sg:3, sw:1.5, op:0.9, dr:3.2, dg:2, dd:4 },
];

function processThreads(raw: ThreadDef[], isSmall: boolean): ThreadDef[] {
  const originOff = isSmall ? 50 : 100;
  const endOff = isSmall ? 100 : 300;
  const yShift = isSmall ? 50 : 60;

  return raw.map(t => {
    const pts = [...t.pts];

    for (let i = 0; i < 9; i++) {
      const lerp = i / 8;
      pts[i * 2 + 1] -= originOff + (endOff - originOff) * lerp;
    }

    if (yShift) {
      for (let i = 0; i < 9; i++) {
        pts[i * 2 + 1] += yShift;
      }
    }

    const origX = pts[0];
    const endX = pts[16];
    const xRange = endX - origX;
    const X_PAD = 15;
    for (let i = 0; i < 9; i++) {
      const xi = i * 2;
      pts[xi] = -X_PAD + ((pts[xi] - origX) / xRange) * (VB_W + X_PAD * 2);
    }

    for (let i = 0; i < 9; i++) {
      const yi = i * 2 + 1;
      pts[yi] = CENTER_Y + (pts[yi] - CENTER_Y) * 0.75;
    }

    return { ...t, pts, dd: t.dd * 1.25 };
  });
}

function buildPath(pts: number[]): string {
  return `M${pts[0]} ${pts[1]} Q${pts[2]} ${pts[3]} ${pts[4]} ${pts[5]} Q${pts[6]} ${pts[7]} ${pts[8]} ${pts[9]} Q${pts[10]} ${pts[11]} ${pts[12]} ${pts[13]} Q${pts[14]} ${pts[15]} ${pts[16]} ${pts[17]}`;
}

function morphPoints(basePts: number[], time: number, threadIndex: number): number[] {
  const result = new Array(basePts.length);
  const threadPhase = threadIndex * 0.52;
  const numPairs = basePts.length / 2;

  for (let i = 0; i < numPairs; i++) {
    const xi = i * 2;
    const yi = i * 2 + 1;
    const fraction = i / (numPairs - 1);
    const morphWeight = Math.sin(fraction * Math.PI);

    const dy =
      morphWeight * 13.5 * Math.sin(time * 0.35 + fraction * 4.5 + threadPhase) +
      morphWeight * 6.75 * Math.sin(time * 0.6 + fraction * 7.0 + threadPhase * 0.7) +
      morphWeight * 3.75 * Math.sin(time * 0.9 + fraction * 2.5 + threadPhase * 1.3);

    const dx =
      morphWeight * 5 * Math.cos(time * 0.28 + fraction * 3.8 + threadPhase * 0.5) +
      morphWeight * 3 * Math.cos(time * 0.55 + fraction * 6.0 + threadPhase * 0.9);

    result[xi] = basePts[xi] + dx;
    result[yi] = basePts[yi] + dy;
  }

  return result;
}

function evalPathAt(pts: number[], t: number): [number, number] {
  const segT = t * 4;
  const seg = Math.min(Math.floor(segT), 3);
  const lt = segT - seg;
  const si = seg * 4;
  const sx = pts[si], sy = pts[si + 1];
  const cx = pts[si + 2], cy = pts[si + 3];
  const ex = pts[si + 4], ey = pts[si + 5];
  const omt = 1 - lt;
  const x = omt * omt * sx + 2 * omt * lt * cx + lt * lt * ex;
  const y = omt * omt * sy + 2 * omt * lt * cy + lt * lt * ey;
  return [x, y];
}

export function AuthBackground({ children }: { children: React.ReactNode }) {
  const [isSmall, setIsSmall] = useState(false);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const rafRef = useRef<number>(0);
  const threadsRef = useRef<ThreadDef[]>([]);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setIsSmall(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const threads = useMemo(
    () => processThreads(RAW_THREADS, isSmall),
    [isSmall]
  );
  threadsRef.current = threads;

  useEffect(() => {
    let startTime: number | null = null;

    function animate(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const time = (timestamp - startTime) / 1000;
      const currentThreads = threadsRef.current;

      for (let i = 0; i < currentThreads.length; i++) {
        const morphed = morphPoints(currentThreads[i].pts, time, i);

        const pathEl = pathRefs.current[i];
        if (pathEl) {
          pathEl.setAttribute("d", buildPath(morphed));
        }

        const dotEl = dotRefs.current[i];
        if (dotEl) {
          const dur = currentThreads[i].dd;
          const phase = DOT_PHASES[i];
          const progress = ((time / dur) + phase) % 1;
          const [dx, dy] = evalPathAt(morphed, progress);
          dotEl.setAttribute("cx", String(dx));
          dotEl.setAttribute("cy", String(dy));
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const gradientNames = useMemo(() => ["", "threadFade1", "threadFade2", "threadFade3"], []);
  const pulseNames = useMemo(() => ["", "neonPulse1", "neonPulse2", "neonPulse3"], []);

  return (
    <div className="min-h-svh w-screen relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-white">
        <svg
          className="absolute top-0 left-1/2 -translate-x-1/2 min-w-[1400px] w-full h-full"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <radialGradient id="neonPulse1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(216,180,254,1)" />
              <stop offset="30%" stopColor="rgba(192,132,252,1)" />
              <stop offset="70%" stopColor="rgba(167,139,250,0.75)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0)" />
            </radialGradient>
            <radialGradient id="neonPulse2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(216,180,254,1)" />
              <stop offset="25%" stopColor="rgba(183,148,246,1)" />
              <stop offset="60%" stopColor="rgba(167,139,250,0.625)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0)" />
            </radialGradient>
            <radialGradient id="neonPulse3" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(216,180,254,1)" />
              <stop offset="35%" stopColor="rgba(192,132,252,1)" />
              <stop offset="75%" stopColor="rgba(167,139,250,0.625)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0)" />
            </radialGradient>
            <radialGradient id="heroTextBg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(147,51,234,0.08)" />
              <stop offset="40%" stopColor="rgba(139,92,246,0.04)" />
              <stop offset="80%" stopColor="rgba(124,58,237,0.02)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <filter id="heroTextBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="12" result="blur" />
              <feTurbulence baseFrequency="0.7" numOctaves="4" result="noise" />
              <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
              <feComponentTransfer in="monoNoise" result="alphaAdjustedNoise">
                <feFuncA type="discrete" tableValues="0.03 0.06 0.09 0.12" />
              </feComponentTransfer>
              <feComposite in="blur" in2="alphaAdjustedNoise" operator="multiply" result="noisyBlur" />
              <feMerge>
                <feMergeNode in="noisyBlur" />
              </feMerge>
            </filter>
            <linearGradient id="threadFade1" x1="0" y1="0" x2={VB_W} y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,1)" />
              <stop offset="20%" stopColor="rgba(196,181,253,0.5)" />
              <stop offset="80%" stopColor="rgba(196,181,253,0.5)" />
              <stop offset="100%" stopColor="rgba(255,255,255,1)" />
            </linearGradient>
            <linearGradient id="threadFade2" x1="0" y1="0" x2={VB_W} y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,1)" />
              <stop offset="18%" stopColor="rgba(183,148,246,0.4)" />
              <stop offset="82%" stopColor="rgba(183,148,246,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,1)" />
            </linearGradient>
            <linearGradient id="threadFade3" x1="0" y1="0" x2={VB_W} y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,1)" />
              <stop offset="22%" stopColor="rgba(167,139,250,0.45)" />
              <stop offset="78%" stopColor="rgba(167,139,250,0.45)" />
              <stop offset="100%" stopColor="rgba(255,255,255,1)" />
            </linearGradient>
            <filter id="neonGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g>
            <ellipse cx="720" cy="400" rx="720" ry="300" fill="url(#heroTextBg)" filter="url(#heroTextBlur)" opacity="0.6" />
            <ellipse cx="720" cy="380" rx="800" ry="350" fill="url(#heroTextBg)" filter="url(#heroTextBlur)" opacity="0.4" />

            {threads.map((t, i) => {
              const [initCx, initCy] = evalPathAt(t.pts, DOT_PHASES[i]);
              return (
                <g key={i}>
                  <path
                    ref={el => { pathRefs.current[i] = el }}
                    d={buildPath(t.pts)}
                    stroke={`url(#${gradientNames[t.sg]})`}
                    strokeWidth={t.sw}
                    fill="none"
                    opacity={t.op}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    ref={el => { dotRefs.current[i] = el }}
                    cx={initCx}
                    cy={initCy}
                    r={t.dr}
                    fill={`url(#${pulseNames[t.dg]})`}
                    opacity="1"
                    filter="url(#neonGlow)"
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="relative z-10 flex min-h-svh w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
}

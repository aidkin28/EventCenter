import React from "react";
import { TILE_W, TILE_H } from "./isometricUtils";

interface IsometricStageProps {
  bannerText?: string;
  offsetX?: number;
  offsetY?: number;
}

/**
 * 3D isometric stage with truss frame, isometric banner, speakers, and standing tables.
 */
const IsometricStage: React.FC<IsometricStageProps> = ({
  bannerText = "Convene",
  offsetX = 0,
  offsetY = 0,
}) => {
  const iso = (gx: number, gy: number) => ({
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  });

  // ── Stage platform (8 wide × 5 deep) ──
  const tl = iso(-4, -2.5);
  const tr = iso(4, -2.5);
  const br = iso(4, 2.5);
  const bl = iso(-4, 2.5);
  const pH = 14;

  const topFace = `${tl.x},${tl.y - pH} ${tr.x},${tr.y - pH} ${br.x},${br.y - pH} ${bl.x},${bl.y - pH}`;
  const faceLeft = `${tl.x},${tl.y - pH} ${bl.x},${bl.y - pH} ${bl.x},${bl.y} ${tl.x},${tl.y}`;
  const faceRight = `${bl.x},${bl.y - pH} ${br.x},${br.y - pH} ${br.x},${br.y} ${bl.x},${bl.y}`;
  const faceSideRight = `${br.x},${br.y - pH} ${tr.x},${tr.y - pH} ${tr.x},${tr.y} ${br.x},${br.y}`;

  // ── Truss frame (isometric arch above stage) ──
  // Two vertical truss legs at back corners of stage, connected by a horizontal bar
  const trussH = 100; // height of truss legs
  const trussW = 3;   // thickness

  // Truss leg positions — at the back edge of the stage
  const trussL = iso(-3.5, -2.5); // left leg
  const trussR = iso(3.5, -2.5);  // right leg

  // ── Isometric banner hanging from truss ──
  // Banner is an isometric parallelogram matching the stage's back-edge angle
  const bannerH = 28;
  const bannerTopY = trussL.y - pH - trussH + 15;
  // The banner follows the isometric back edge, inset proportionally
  const trussSpanX = trussR.x - trussL.x;
  const trussSpanY = trussR.y - trussL.y;
  const inset = 8;
  const insetRatio = inset / trussSpanX; // how far we inset relative to the full span
  const bTL = { x: trussL.x + inset, y: bannerTopY + trussSpanY * insetRatio };
  const bTR = { x: trussR.x - inset, y: bannerTopY + trussSpanY * (1 - insetRatio) };
  const bBR = { x: bTR.x, y: bTR.y + bannerH };
  const bBL = { x: bTL.x, y: bTL.y + bannerH };

  const bannerPoly = `${bTL.x},${bTL.y} ${bTR.x},${bTR.y} ${bBR.x},${bBR.y} ${bBL.x},${bBL.y}`;
  const bannerCenterX = (bTL.x + bTR.x) / 2;
  const bannerCenterY = (bTL.y + bTR.y) / 2 + bannerH / 2 + 1;
  // Angle of the banner's top edge — text rotates to match
  const bannerAngle = Math.atan2(bTR.y - bTL.y, bTR.x - bTL.x) * (180 / Math.PI);

  // ── Speakers — on back edge of stage, both facing bottom-left ──
  const spkPositions = [iso(-3.5, -2.5), iso(3.5, -2.5)];

  // ── Standing tables — 2 rows in front ──
  const tableH = 16;
  const tableTopRx = 7;
  const tableTopRy = 3.5;
  const tableRow1 = [
    iso(-3, 4),
    iso(-1, 4),
    iso(1, 4),
    iso(3, 4),
  ];
  const tableRow2 = [
    iso(-2, 5.5),
    iso(0, 5.5),
    iso(2, 5.5),
  ];

  const renderTable = (pos: { x: number; y: number }, key: string) => (
    <g key={key}>
      <line
        x1={pos.x} y1={pos.y - tableH}
        x2={pos.x} y2={pos.y}
        stroke="#1a1a1a" strokeWidth={2} strokeLinecap="round"
      />
      <ellipse cx={pos.x} cy={pos.y} rx={3} ry={1.5} fill="#2a2a2a" />
      <ellipse
        cx={pos.x} cy={pos.y - tableH}
        rx={tableTopRx} ry={tableTopRy}
        fill="#f5f5f5" stroke="#ddd" strokeWidth={0.5}
      />
    </g>
  );

  // Abstract isometric speaker box — faces bottom-left like the stage
  // Uses the same isometric axes: left face goes down-left, right face goes down-right
  const renderSpeaker = (pos: { x: number; y: number }, key: string) => {
    const bx = pos.x;
    const by = pos.y - pH; // sitting on stage surface
    const sw = 8;  // half-width along iso left axis
    const sd = 6;  // half-depth along iso right axis
    const sh = 20; // height

    // Isometric offsets for the two axes
    const lx = -sw;       // left axis dx
    const ly = sw / 2;    // left axis dy
    const rx = sd;        // right axis dx
    const ry = sd / 2;    // right axis dy

    // Top face
    const top = `${bx},${by - sh} ${bx + lx},${by + ly - sh} ${bx + lx + rx},${by + ly + ry - sh} ${bx + rx},${by + ry - sh}`;
    // Left face (facing bottom-left — the visible "front")
    const left = `${bx},${by - sh} ${bx + lx},${by + ly - sh} ${bx + lx},${by + ly} ${bx},${by}`;
    // Right face
    const right = `${bx},${by - sh} ${bx + rx},${by + ry - sh} ${bx + rx},${by + ry} ${bx},${by}`;

    return (
      <g key={key}>
        <polygon points={left} fill="#1a1a1a" stroke="#333" strokeWidth={0.5} />
        <polygon points={right} fill="#111" stroke="#333" strokeWidth={0.5} />
        <polygon points={top} fill="#2a2a2a" stroke="#333" strokeWidth={0.5} />
        {/* Abstract speaker grill lines on left face */}
        {[0.25, 0.45, 0.65, 0.85].map((t) => {
          const y1 = by + ly - sh + sh * t;
          const y2 = by - sh + sh * t;
          return (
            <line
              key={`grill-${key}-${t}`}
              x1={bx + lx + 1} y1={y1}
              x2={bx - 1} y2={y2}
              stroke="#333" strokeWidth={0.8} opacity={0.5}
            />
          );
        })}
      </g>
    );
  };

  return (
    <g transform={`translate(${offsetX}, ${offsetY})`}>
      {/* Stage platform */}
      <polygon points={topFace} fill="#3a3a3a" stroke="#2a2a2a" strokeWidth={1} />
      <polygon points={faceLeft} fill="#2a2a2a" stroke="#222" strokeWidth={0.5} />
      <polygon points={faceRight} fill="#333" stroke="#222" strokeWidth={0.5} />
      <polygon points={faceSideRight} fill="#2f2f2f" stroke="#222" strokeWidth={0.5} />

      {/* Red accent trim */}
      <line x1={tl.x} y1={tl.y - pH} x2={bl.x} y2={bl.y - pH} stroke="#ec121f" strokeWidth={2.5} />
      <line x1={bl.x} y1={bl.y - pH} x2={br.x} y2={br.y - pH} stroke="#ec121f" strokeWidth={2.5} />
      <line x1={br.x} y1={br.y - pH} x2={tr.x} y2={tr.y - pH} stroke="#ec121f" strokeWidth={2.5} />

      {/* Spotlights */}
      {[iso(-1.5, 0), iso(0, 0), iso(1.5, 0)].map((pos, i) => (
        <g key={`spot-${i}`}>
          <polygon
            points={`${pos.x},${pos.y - pH - 80} ${pos.x - 14},${pos.y - pH} ${pos.x + 14},${pos.y - pH}`}
            fill={`rgba(255, 240, 150, ${0.07 + i * 0.02})`}
          />
          <ellipse
            cx={pos.x} cy={pos.y - pH}
            rx={TILE_W * 0.3} ry={TILE_H * 0.3}
            fill="rgba(255, 240, 150, 0.12)"
          />
          <circle cx={pos.x} cy={pos.y - pH - 80} r={2.5} fill="#ffd700" />
        </g>
      ))}

      {/* ── Truss frame ── */}
      {/* Left leg */}
      <rect x={trussL.x - trussW / 2} y={trussL.y - pH - trussH} width={trussW} height={trussH} fill="#777" rx={1} />
      {/* Right leg */}
      <rect x={trussR.x - trussW / 2} y={trussR.y - pH - trussH} width={trussW} height={trussH} fill="#777" rx={1} />
      {/* Horizontal cross bar (isometric angle matching the back edge) */}
      <line
        x1={trussL.x} y1={trussL.y - pH - trussH}
        x2={trussR.x} y2={trussR.y - pH - trussH}
        stroke="#888" strokeWidth={trussW}
      />
      {/* Second cross bar slightly lower for truss look */}
      <line
        x1={trussL.x} y1={trussL.y - pH - trussH + 8}
        x2={trussR.x} y2={trussR.y - pH - trussH + 8}
        stroke="#666" strokeWidth={1.5}
      />
      {/* Diagonal truss braces */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t = i / 5;
        const bx = trussL.x + (trussR.x - trussL.x) * t;
        const by = trussL.y + (trussR.y - trussL.y) * t;
        return (
          <line
            key={`brace-${i}`}
            x1={bx} y1={by - pH - trussH}
            x2={bx} y2={by - pH - trussH + 8}
            stroke="#999" strokeWidth={1} opacity={0.6}
          />
        );
      })}

      {/* ── Isometric banner ── */}
      <polygon points={bannerPoly} fill="white" stroke="#ec121f" strokeWidth={2} />
      {/* Red border accent on bottom edge */}
      <line x1={bBL.x} y1={bBL.y} x2={bBR.x} y2={bBR.y} stroke="#ec121f" strokeWidth={3} />
      {/* Banner text — rotated + skewed to match isometric perspective */}
      <g transform={`translate(${bannerCenterX}, ${bannerCenterY}) rotate(${bannerAngle}) skewX(25) translate(${-bannerCenterX}, ${-bannerCenterY})`}>
        <text
          x={bannerCenterX}
          y={bannerCenterY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={18}
          fontWeight="900"
          fontFamily="Arial Black, Arial, sans-serif"
          fill="#ec121f"
          letterSpacing={3}
        >
          {bannerText.toUpperCase()}
        </text>
      </g>

      {/* ── Speakers ── */}
      {spkPositions.map((pos, i) => renderSpeaker(pos, `spk-${i}`))}

      {/* ── Standing tables ── */}
      {tableRow1.map((pos, i) => renderTable(pos, `t1-${i}`))}
      {tableRow2.map((pos, i) => renderTable(pos, `t2-${i}`))}
    </g>
  );
};

export default React.memo(IsometricStage);

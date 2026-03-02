import React from "react";
import { TILE_W, TILE_H } from "./isometricUtils";
import { adjustColor } from "./isometricUtils";

interface IsometricRegistrationProps {
  offsetX?: number;
  offsetY?: number;
}

/**
 * Isometric registration booth with desk, sign, and attendant.
 * Desk faces bottom-right so visitors from the center approach naturally.
 */
const IsometricRegistration: React.FC<IsometricRegistrationProps> = ({
  offsetX = 0,
  offsetY = 0,
}) => {
  const iso = (gx: number, gy: number) => ({
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  });

  // ── Desk (rotated to face bottom-right: 1.5 wide × 3 deep) ──
  // Diamond corners named by screen position
  const deskH = 14;
  const dT = iso(-0.75, -1.5); // top of diamond
  const dR = iso(0.75, -1.5);  // right of diamond
  const dB = iso(0.75, 1.5);   // bottom of diamond
  const dL = iso(-0.75, 1.5);  // left of diamond

  const deskTop = `${dT.x},${dT.y - deskH} ${dR.x},${dR.y - deskH} ${dB.x},${dB.y - deskH} ${dL.x},${dL.y - deskH}`;
  // Front-right face (T→R edge, faces upper-right)
  const deskFaceRight = `${dT.x},${dT.y - deskH} ${dR.x},${dR.y - deskH} ${dR.x},${dR.y} ${dT.x},${dT.y}`;
  // Front face (R→B edge, faces bottom-right — main counter front)
  const deskFaceFront = `${dR.x},${dR.y - deskH} ${dB.x},${dB.y - deskH} ${dB.x},${dB.y} ${dR.x},${dR.y}`;
  // Side face (L→B edge, faces bottom-left)
  const deskFaceSide = `${dL.x},${dL.y - deskH} ${dB.x},${dB.y - deskH} ${dB.x},${dB.y} ${dL.x},${dL.y}`;

  // ── "Registration" sign on a pole behind the desk (upper-left side) ──
  const signPos = iso(-1.0, 0);
  const signPoleH = 40;
  const signW = 56;
  const signH = 14;
  const signTopY = signPos.y - signPoleH;

  // ── Attendant standing behind desk (toward upper-left / back side) ──
  const attPos = iso(-0.3, 0);
  const attX = attPos.x;
  const attBaseY = attPos.y - deskH;

  // Attendant appearance
  const skinHex = "#E0B88A";
  const hairColor = "#3B2314";
  const shirtColor = "#ec121f"; // Scotia red polo
  const pantsColor = "#1B2838";
  const attHeight = 34;
  const headR = 5.5;

  // ── Items on desk ──
  const monitorPos = iso(0.1, -0.6);
  const stackPos = iso(0.1, 0.8);

  return (
    <g transform={`translate(${offsetX}, ${offsetY})`}>
      {/* ── Desk ── */}
      <polygon points={deskFaceSide} fill="#e0d9ce" stroke="#d4ccc0" strokeWidth={0.5} />
      <polygon points={deskFaceFront} fill="#ebe5da" stroke="#d4ccc0" strokeWidth={0.5} />
      <polygon points={deskFaceRight} fill="#f5f0e8" stroke="#d4ccc0" strokeWidth={0.5} />
      <polygon points={deskTop} fill="#faf6f0" stroke="#d4ccc0" strokeWidth={0.5} />

      {/* Red accent strip along front edges (T→R and R→B) + left side (L→B) */}
      <line x1={dT.x} y1={dT.y - deskH} x2={dR.x} y2={dR.y - deskH} stroke="#ec121f" strokeWidth={2} />
      <line x1={dR.x} y1={dR.y - deskH} x2={dB.x} y2={dB.y - deskH} stroke="#ec121f" strokeWidth={1.5} />
      <line x1={dL.x} y1={dL.y - deskH} x2={dB.x} y2={dB.y - deskH} stroke="#ec121f" strokeWidth={1.5} />

      {/* ── Monitor on desk ── */}
      <g transform={`translate(${monitorPos.x}, ${monitorPos.y - deskH})`}>
        {/* Screen */}
        <rect x={-6} y={-12} width={12} height={9} rx={1} fill="#1a1a1a" stroke="#333" strokeWidth={0.5} />
        <rect x={-5} y={-11} width={10} height={7} rx={0.5} fill="#4a90d9" />
        {/* Stand */}
        <rect x={-1} y={-3} width={2} height={3} fill="#555" />
        <ellipse cx={0} cy={0} rx={4} ry={1.5} fill="#444" />
      </g>

      {/* ── Paper stack on desk ── */}
      <g transform={`translate(${stackPos.x}, ${stackPos.y - deskH})`}>
        <rect x={-4} y={-2} width={8} height={2} rx={0.5} fill="#fff" stroke="#ccc" strokeWidth={0.3} />
        <rect x={-4} y={-3.5} width={8} height={2} rx={0.5} fill="#f8f8f8" stroke="#ccc" strokeWidth={0.3} />
        <rect x={-4} y={-5} width={8} height={2} rx={0.5} fill="#f0f0f0" stroke="#ccc" strokeWidth={0.3} />
      </g>

      {/* ── Sign pole + sign ── */}
      <line
        x1={signPos.x} y1={signPos.y}
        x2={signPos.x} y2={signTopY}
        stroke="#888" strokeWidth={2.5} strokeLinecap="round"
      />
      {/* Sign board */}
      <rect
        x={signPos.x - signW / 2} y={signTopY}
        width={signW} height={signH}
        rx={2} fill="white" stroke="#ec121f" strokeWidth={1.5}
      />
      <text
        x={signPos.x} y={signTopY + signH / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={7}
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
        fill="#ec121f"
      >
        REGISTRATION
      </text>

      {/* ── Attendant ── */}
      <g transform={`translate(${attX}, ${attBaseY})`}>
        {/* Shadow */}
        <ellipse cx={0} cy={2} rx={8} ry={3} fill="rgba(0,0,0,0.15)" />

        {/* Legs */}
        <rect x={-3} y={-4} width={3} height={12} rx={1.5} fill={pantsColor} />
        <rect x={1} y={-4} width={3} height={12} rx={1.5} fill={pantsColor} />
        {/* Shoes */}
        <rect x={-3.5} y={7} width={4} height={2.5} rx={1} fill="#2a2a2a" />
        <rect x={0.5} y={7} width={4} height={2.5} rx={1} fill="#2a2a2a" />

        {/* Torso */}
        <path
          d={`M-6,${-attHeight + 18} Q-7,${-6} -5,${-4} L5,${-4} Q7,${-6} 6,${-attHeight + 18} Z`}
          fill={shirtColor}
        />

        {/* Collar / neckline */}
        <path
          d={`M-2,${-attHeight + 18} L0,${-attHeight + 21} L2,${-attHeight + 18}`}
          fill="none" stroke={adjustColor(shirtColor, -30)} strokeWidth={1}
        />

        {/* Arms at sides */}
        <rect x={-8} y={-attHeight + 19} width={3} height={11} rx={1.5} fill={shirtColor} />
        <rect x={5.5} y={-attHeight + 19} width={3} height={11} rx={1.5} fill={shirtColor} />
        {/* Hands */}
        <circle cx={-6.5} cy={-attHeight + 31} r={2} fill={skinHex} />
        <circle cx={7} cy={-attHeight + 31} r={2} fill={skinHex} />

        {/* Neck */}
        <rect x={-2} y={-attHeight + 14} width={4} height={5} rx={1.5} fill={skinHex} />

        {/* Head */}
        <ellipse cx={0} cy={-attHeight + 10} rx={headR} ry={headR + 0.5} fill={skinHex} />

        {/* Eyes */}
        <circle cx={-2} cy={-attHeight + 9.5} r={0.8} fill="#1a1a1a" />
        <circle cx={2} cy={-attHeight + 9.5} r={0.8} fill="#1a1a1a" />
        {/* Smile */}
        <path
          d={`M-1.5,${-attHeight + 12} Q0,${-attHeight + 13.5} 1.5,${-attHeight + 12}`}
          fill="none" stroke={adjustColor(skinHex, -30)} strokeWidth={0.8}
        />

        {/* Hair */}
        <ellipse cx={0} cy={-attHeight + 6} rx={headR} ry={4} fill={hairColor} />
        <rect x={-headR} y={-attHeight + 6} width={headR * 2} height={3} rx={2} fill={hairColor} />
      </g>
    </g>
  );
};

export default React.memo(IsometricRegistration);

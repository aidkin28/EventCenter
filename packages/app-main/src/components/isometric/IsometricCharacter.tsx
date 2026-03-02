import React from "react";
import type { Character } from "./types";
import { gridToIso, adjustColor } from "./isometricUtils";

interface IsometricCharacterProps {
  character: Character;
  /** Whether this character is near the stage and should show an "AI" bubble */
  showAIBubble?: boolean;
}

/** Detailed isometric walking character with clothing, face, hair, and speech bubbles */
const IsometricCharacter: React.FC<IsometricCharacterProps> = ({ character, showAIBubble = false }) => {
  const { gender, skin, hair, clothing, x, y, dir, walkCycle, height, state, interactionTargetName, stageTopic } = character;

  const iso = gridToIso(x, y);

  // Continuous sin-based animation — smooth legs and arms (only when moving)
  const isMoving = state === "walking" || state === "departing";
  const legSwing = isMoving ? Math.sin(walkCycle) * 3 : 0;
  const armSwing = isMoving ? -Math.sin(walkCycle) * 2.5 : 0;
  const bounce = isMoving ? Math.abs(Math.sin(walkCycle * 2)) * 0.5 : 0;

  const facingLeft = dir === 3;
  const facingAway = dir === 0;
  const scaleX = facingLeft ? -1 : 1;
  const bodyShade = facingAway ? -15 : 0;

  const W = 30;
  const H = height + 20;
  const cx = W / 2;

  const jacketColor = clothing.hasJacket && clothing.jacket ? adjustColor(clothing.jacket, bodyShade) : null;
  const shirtColor = adjustColor(clothing.shirt, bodyShade);
  const pantsColor = adjustColor(clothing.pants, bodyShade);

  const headR = gender === "female" ? 5.5 : 6;
  const shoulderW = gender === "female" ? 10 : 12;
  const hipW = gender === "female" ? 9 : 10;

  // Determine which speech bubble to show (stage AI takes priority)
  const showAI = showAIBubble;
  const showGreeting = !showAI && state === "greeting" && interactionTargetName;
  const showChatting = !showAI && state === "chatting";

  return (
    <g transform={`translate(${iso.x - W / 2}, ${iso.y - H + 4 - bounce})`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="visible">
        <g transform={`scale(${scaleX}, 1) translate(${scaleX === -1 ? -W : 0}, 0)`}>
          {/* Shadow */}
          <ellipse cx={cx} cy={H - 2} rx={10} ry={4} fill="rgba(0,0,0,0.25)" />

          {/* Left leg */}
          <g transform={`translate(${cx - 3}, ${H - 18})`}>
            <rect
              x={-1.5} y={0} width={3.5} height={14} rx={1.5}
              fill={clothing.isDress ? shirtColor : pantsColor}
              transform={`rotate(${legSwing})`}
            />
            <rect
              x={-1.5} y={12} width={4} height={3} rx={1}
              fill="#2a2a2a"
              transform={`rotate(${legSwing})`}
            />
          </g>

          {/* Right leg */}
          <g transform={`translate(${cx + 3}, ${H - 18})`}>
            <rect
              x={-2} y={0} width={3.5} height={14} rx={1.5}
              fill={clothing.isDress ? shirtColor : pantsColor}
              transform={`rotate(${-legSwing})`}
            />
            <rect
              x={-2} y={12} width={4} height={3} rx={1}
              fill="#2a2a2a"
              transform={`rotate(${-legSwing})`}
            />
          </g>

          {/* Dress/skirt overlay */}
          {clothing.isDress && (
            <path
              d={`M${cx - hipW / 2 - 1},${H - 20} Q${cx},${H - 12} ${cx + hipW / 2 + 1},${H - 20} L${cx + hipW / 2 + 2},${H - 12} L${cx - hipW / 2 - 2},${H - 12} Z`}
              fill={shirtColor}
            />
          )}

          {/* Body / Torso */}
          <path
            d={`M${cx - shoulderW / 2},${H - 34} Q${cx - shoulderW / 2 - 1},${H - 22} ${cx - hipW / 2},${H - 18} L${cx + hipW / 2},${H - 18} Q${cx + shoulderW / 2 + 1},${H - 22} ${cx + shoulderW / 2},${H - 34} Z`}
            fill={jacketColor || shirtColor}
          />

          {/* Shirt visible under jacket */}
          {clothing.hasJacket && !clothing.isHoodie && (
            <rect x={cx - 2.5} y={H - 33} width={5} height={14} rx={1} fill={shirtColor} />
          )}

          {/* Tie */}
          {clothing.hasTie && clothing.tie && (
            <g>
              <rect x={cx - 1} y={H - 32} width={2} height={10} fill={clothing.tie} />
              <polygon
                points={`${cx - 1.5},${H - 22} ${cx + 1.5},${H - 22} ${cx},${H - 19}`}
                fill={clothing.tie}
              />
            </g>
          )}

          {/* Pattern stripes */}
          {clothing.hasPattern && (
            <g opacity={0.3}>
              <line x1={cx - 4} y1={H - 32} x2={cx - 4} y2={H - 20} stroke="#fff" strokeWidth={1} />
              <line x1={cx} y1={H - 33} x2={cx} y2={H - 19} stroke="#fff" strokeWidth={1} />
              <line x1={cx + 4} y1={H - 32} x2={cx + 4} y2={H - 20} stroke="#fff" strokeWidth={1} />
            </g>
          )}

          {/* Hoodie kangaroo pocket */}
          {clothing.isHoodie && clothing.jacket && (
            <rect x={cx - 4} y={H - 26} width={8} height={4} rx={2} fill={adjustColor(clothing.jacket, 15)} opacity={0.6} />
          )}

          {/* Sweater texture */}
          {clothing.isSweater && (
            <g opacity={0.2}>
              {[0, 3, 6, 9].map((yy) => (
                <line key={yy} x1={cx - 5} y1={H - 32 + yy} x2={cx + 5} y2={H - 32 + yy} stroke="#fff" strokeWidth={0.5} />
              ))}
            </g>
          )}

          {/* Left arm */}
          <g transform={`translate(${cx - shoulderW / 2 - 1}, ${H - 33})`}>
            <rect
              x={-2} y={0} width={3} height={12} rx={1.5}
              fill={jacketColor || shirtColor}
              transform={`rotate(${armSwing})`}
            />
            <circle cx={-0.5} cy={12} r={2} fill={skin.hex} transform={`rotate(${armSwing})`} />
          </g>

          {/* Right arm */}
          <g transform={`translate(${cx + shoulderW / 2 - 1}, ${H - 33})`}>
            <rect
              x={-1} y={0} width={3} height={12} rx={1.5}
              fill={jacketColor || shirtColor}
              transform={`rotate(${-armSwing})`}
            />
            <circle cx={0.5} cy={12} r={2} fill={skin.hex} transform={`rotate(${-armSwing})`} />
          </g>

          {/* Neck */}
          <rect x={cx - 2} y={H - 38} width={4} height={5} rx={1.5} fill={skin.hex} />

          {/* Head */}
          <ellipse cx={cx} cy={H - 42} rx={headR} ry={headR + 0.5} fill={skin.hex} />

          {/* Face features */}
          {!facingAway && (
            <g>
              <circle cx={cx - 2.2} cy={H - 42.5} r={0.8} fill="#1a1a1a" />
              <circle cx={cx + 2.2} cy={H - 42.5} r={0.8} fill="#1a1a1a" />
              <ellipse cx={cx} cy={H - 40} rx={1.5} ry={0.5} fill={adjustColor(skin.hex, -30)} />
            </g>
          )}

          {/* Hair */}
          {gender === "male" ? (
            <g>
              <ellipse cx={cx} cy={H - 46} rx={headR - 0.5} ry={4} fill={hair} />
              <rect x={cx - headR + 0.5} y={H - 46} width={headR * 2 - 1} height={3} rx={2} fill={hair} />
            </g>
          ) : (
            <g>
              <ellipse cx={cx} cy={H - 46} rx={headR} ry={4.5} fill={hair} />
              <rect x={cx - headR} y={H - 45} width={headR * 2} height={4} rx={2} fill={hair} />
              {/* Long hair sides */}
              <rect x={cx - headR - 1} y={H - 44} width={2.5} height={12} rx={1} fill={hair} />
              <rect x={cx + headR - 1.5} y={H - 44} width={2.5} height={12} rx={1} fill={hair} />
            </g>
          )}

          {/* Hoodie hood outline */}
          {clothing.isHoodie && clothing.jacket && (
            <path
              d={`M${cx - headR - 2},${H - 36} Q${cx - headR - 3},${H - 47} ${cx},${H - 49} Q${cx + headR + 3},${H - 47} ${cx + headR + 2},${H - 36}`}
              fill="none"
              stroke={clothing.jacket}
              strokeWidth={2.5}
              opacity={0.7}
            />
          )}

          {/* Sport jacket collar */}
          {clothing.isSport && jacketColor && (
            <g>
              <path d={`M${cx - 3},${H - 35} L${cx - 6},${H - 30}`} stroke={jacketColor} strokeWidth={2.5} fill="none" />
              <path d={`M${cx + 3},${H - 35} L${cx + 6},${H - 30}`} stroke={jacketColor} strokeWidth={2.5} fill="none" />
            </g>
          )}
        </g>
      </svg>

      {/* ── Speech Bubbles (outside nested SVG to avoid text clipping) ── */}

      {/* Stage topic bubble — shown when character is near the stage */}
      {showAI && (
        <g transform={`translate(${cx}, -2)`}>
          <rect x={-24} y={-14} width={48} height={13} rx={4} fill="white" stroke="#333" strokeWidth={0.5} />
          <polygon points="-3,-1 3,-1 0,4" fill="white" />
          <line x1={-3} y1={-1} x2={3} y2={-1} stroke="#333" strokeWidth={0.5} />
          <text
            x={0} y={-7}
            textAnchor="middle" dominantBaseline="central"
            fontSize={5} fontFamily="Arial, sans-serif"
            fill="#333"
          >
            {stageTopic}
          </text>
        </g>
      )}

      {/* Greeting bubble — "Hi <name>!" */}
      {showGreeting && (
        <g transform={`translate(${cx}, -2)`}>
          <rect x={-24} y={-14} width={48} height={13} rx={4} fill="white" stroke="#333" strokeWidth={0.5} />
          <polygon points="-3,-1 3,-1 0,4" fill="white" />
          <line x1={-3} y1={-1} x2={3} y2={-1} stroke="#333" strokeWidth={0.5} />
          <text
            x={0} y={-7}
            textAnchor="middle" dominantBaseline="central"
            fontSize={5} fontFamily="Arial, sans-serif"
            fill="#333"
          >
            {`Hi ${interactionTargetName}!`}
          </text>
        </g>
      )}

      {/* Chatting bubble — squiggly lines */}
      {showChatting && (
        <g transform={`translate(${cx}, -2)`}>
          <rect x={-14} y={-14} width={28} height={13} rx={4} fill="white" stroke="#333" strokeWidth={0.5} />
          <polygon points="-3,-1 3,-1 0,4" fill="white" />
          <line x1={-3} y1={-1} x2={3} y2={-1} stroke="#333" strokeWidth={0.5} />
          {/* Squiggly lines representing conversation */}
          <path
            d="M-8,-10 Q-6,-12 -4,-10 Q-2,-8 0,-10 Q2,-12 4,-10 Q6,-8 8,-10"
            fill="none" stroke="#666" strokeWidth={0.8}
          />
          <path
            d="M-6,-6 Q-4,-8 -2,-6 Q0,-4 2,-6 Q4,-8 6,-6"
            fill="none" stroke="#999" strokeWidth={0.6}
          />
        </g>
      )}
    </g>
  );
};

export default IsometricCharacter;

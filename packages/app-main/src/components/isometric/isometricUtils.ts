/** Grid math, constants, and configuration for the isometric event center */

import type { Point, Character, BoothConfig, SkinTone, ClothingStyle } from "./types";

// Isometric tile dimensions
export const TILE_W = 64;
export const TILE_H = 32;

// Direction vectors: N, E, S, W
const DIR_DX = [0, 1, 0, -1];
const DIR_DY = [-1, 0, 1, 0];

// ─── Interaction constants ──────────────────────────────────────────────────
/** Screen-pixel distance threshold for starting an interaction */
export const INTERACTION_DISTANCE = 20;
/** Duration of "Hi <name>!" greeting bubble (ms) */
export const GREETING_MS = 2500;
/** Duration of chatting squiggly lines bubble (ms) */
export const CHATTING_MS = 10000;
/** Duration of walking away after chatting (ms) */
export const DEPARTING_MS = 2000;

// ─── Character Names ────────────────────────────────────────────────────────
const NAMES = [
  "Alex", "Jordan", "Sam", "Morgan", "Riley", "Casey", "Taylor", "Avery",
  "Quinn", "Parker", "Drew", "Reese", "Sage", "Blake", "Skyler", "Jamie",
  "Kai", "Rowan", "Ellis", "Hayden", "Emery", "Finley", "Ari", "Nova",
  "Eden", "Marlowe", "Remy", "Phoenix", "Lennox", "Harper",
];

// ─── Stage Buzzword Topics ──────────────────────────────────────────────────
const STAGE_TOPICS = [
  "AI", "GenAI", "LLMs", "ML Ops", "RAG", "Copilot",
  "Cloud Native", "DevOps", "Agile", "Blockchain",
  "Data Mesh", "IoT", "Edge AI", "Zero Trust",
  "Microservices", "K8s", "CI/CD", "AutoML",
  "Deep Learning", "NLP", "Prompt Eng", "Fine-tuning",
  "Digital Twin", "API First", "Web3", "Big Data",
  "Open Banking", "FinTech", "RegTech", "ESG",
];

// ─── Style Definitions ──────────────────────────────────────────────────────
export const SKIN_TONES: SkinTone[] = [
  { name: "Porcelain", hex: "#FDEBD0" },
  { name: "Fair", hex: "#F5CBA7" },
  { name: "Sand", hex: "#E0B88A" },
  { name: "Olive", hex: "#C9A66B" },
  { name: "Tan", hex: "#B07D4B" },
  { name: "Brown", hex: "#8D5524" },
  { name: "Espresso", hex: "#6B3A1F" },
  { name: "Deep", hex: "#4A2511" },
];

export const HAIR_COLORS = [
  "#1a1a1a", "#3B2314", "#8B4513", "#C4721A", "#D4A03E",
  "#A52A2A", "#2C1810", "#555555", "#E8D5B7",
];

export const CLOTHING_STYLES: ClothingStyle[] = [
  {
    name: "Suit",
    jacket: "#1B2838", shirt: "#FFFFFF", tie: "#8B0000", pants: "#1B2838",
    hasJacket: true, hasTie: true,
  },
  {
    name: "Smart Casual",
    jacket: "#3D5A80", shirt: "#E8E0D4", tie: null, pants: "#2B3A4A",
    hasJacket: true, hasTie: false,
  },
  {
    name: "Pattern Shirt",
    jacket: null, shirt: "#4A90D9", tie: null, pants: "#3A3A3A",
    hasJacket: false, hasTie: false, hasPattern: true,
  },
  {
    name: "Sweater",
    jacket: null, shirt: "#6B4C3B", tie: null, pants: "#2F4F4F",
    hasJacket: false, hasTie: false, isSweater: true,
  },
  {
    name: "Business Dress",
    jacket: null, shirt: "#2C3E6B", tie: null, pants: "#2C3E6B",
    hasJacket: false, hasTie: false, isDress: true,
  },
  {
    name: "Sport Jacket",
    jacket: "#5B7553", shirt: "#D4C5A9", tie: null, pants: "#36454F",
    hasJacket: true, hasTie: false, isSport: true,
  },
  {
    name: "Hacker Hoodie",
    jacket: "#222222", shirt: "#1DB954", tie: null, pants: "#1a1a1a",
    hasJacket: true, hasTie: false, isHoodie: true,
  },
  {
    name: "Formal",
    jacket: "#0D0D0D", shirt: "#F0F0F0", tie: "#1a1a5c", pants: "#0D0D0D",
    hasJacket: true, hasTie: true,
  },
];

const GENDERS: ("male" | "female")[] = ["male", "female"];

// Stage zone bounds (grid coords) — characters avoid this area
export const STAGE_MIN_X = -4;
export const STAGE_MAX_X = 4;
export const STAGE_MIN_Y = -3;
export const STAGE_MAX_Y = 2;

// Booth configs — 3 per side around the stage
export const BOOTH_CONFIGS: BoothConfig[] = [
  { id: "innovation", label: "Innovation", gridX: -7, gridY: -4, color: "#2563EB", accentColor: "#1D4ED8" },
  { id: "networking", label: "Networking", gridX: -7, gridY: 0, color: "#9333EA", accentColor: "#7C3AED" },
  { id: "demos", label: "Demos", gridX: -7, gridY: 4, color: "#EA580C", accentColor: "#C2410C" },
  { id: "workshops", label: "Workshops", gridX: 7, gridY: -4, color: "#16A34A", accentColor: "#15803D" },
  { id: "partners", label: "Partners", gridX: 7, gridY: 0, color: "#0891B2", accentColor: "#0E7490" },
  { id: "careers", label: "Careers", gridX: 7, gridY: 4, color: "#DB2777", accentColor: "#BE185D" },
];

/** Convert grid coordinates to isometric screen position */
export function gridToIso(gx: number, gy: number): Point {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

/** Check if a grid position is within the stage zone (with padding) */
export function isInStageZone(gx: number, gy: number): boolean {
  return (
    gx >= STAGE_MIN_X - 1 &&
    gx <= STAGE_MAX_X + 1 &&
    gy >= STAGE_MIN_Y - 1 &&
    gy <= STAGE_MAX_Y + 1
  );
}

/** Check if a grid position is within any booth zone */
export function isInBoothZone(gx: number, gy: number): boolean {
  return BOOTH_CONFIGS.some(
    (b) => gx >= b.gridX - 1 && gx <= b.gridX + 2 && gy >= b.gridY - 1 && gy <= b.gridY + 2
  );
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Adjust a hex color by a brightness amount */
export function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

// Fixed walkable half-size from center (independent of grid render size)
const WALKABLE_HALF = 18;

/** Create a character at a random position, optionally avoiding stage/booths */
export function createCharacter(id: number, _gridCols: number, _gridRows: number, avoidStage: boolean): Character {
  const gender = pick(GENDERS);

  let x: number, y: number;
  let attempts = 0;
  do {
    x = randRange(-WALKABLE_HALF, WALKABLE_HALF);
    y = randRange(-WALKABLE_HALF, WALKABLE_HALF);
    attempts++;
  } while (avoidStage && (isInStageZone(x, y) || isInBoothZone(x, y)) && attempts < 200);

  return {
    id,
    name: pick(NAMES),
    gender,
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_COLORS),
    clothing: pick(CLOTHING_STYLES),
    x,
    y,
    dir: randRange(0, 3),
    walkCycle: Math.random() * Math.PI * 2,
    speed: 0.012 + Math.random() * 0.01,
    stepsUntilTurn: randRange(80, 250),
    height: gender === "female" ? randRange(28, 34) : randRange(32, 38),
    state: "walking",
    interactionTarget: null,
    interactionTargetName: null,
    stateTimer: 0,
    cooldownTimer: 0,
    stageTopic: pick(STAGE_TOPICS),
  };
}

/**
 * Advance a character by one animation frame — mutates in place.
 * dt is elapsed ms since last frame (typically ~16.67 at 60fps).
 */
export function stepCharacter(char: Character, avoidStage: boolean, dt: number): void {
  const dtFactor = dt / 16.67; // normalize so ~1.0 at 60fps

  // Tick cooldown
  if (char.cooldownTimer > 0) {
    char.cooldownTimer = Math.max(0, char.cooldownTimer - dt);
  }

  switch (char.state) {
    case "walking":
      advanceMovement(char, avoidStage, dtFactor);
      break;

    case "greeting":
      // Stand still, decrement timer
      char.stateTimer -= dt;
      if (char.stateTimer <= 0) {
        char.state = "chatting";
        char.stateTimer = CHATTING_MS;
      }
      break;

    case "chatting":
      // Stand still, decrement timer (transition to departing handled in processInteractions)
      char.stateTimer -= dt;
      break;

    case "departing":
      // Walk away from partner
      advanceMovement(char, avoidStage, dtFactor);
      char.stateTimer -= dt;
      if (char.stateTimer <= 0) {
        char.state = "walking";
        char.interactionTarget = null;
        char.interactionTargetName = null;
        char.cooldownTimer = DEPARTING_MS; // cooldown before next interaction
      }
      break;
  }
}

/** Move a character forward, handling collisions and turns — mutates in place */
function advanceMovement(char: Character, avoidStage: boolean, dtFactor: number): void {
  char.walkCycle += 0.12 * dtFactor;

  const nx = char.x + DIR_DX[char.dir] * char.speed * dtFactor;
  const ny = char.y + DIR_DY[char.dir] * char.speed * dtFactor;

  const hitEdge = nx < -WALKABLE_HALF || nx > WALKABLE_HALF || ny < -WALKABLE_HALF || ny > WALKABLE_HALF;
  const hitZone = avoidStage && (isInStageZone(Math.round(nx), Math.round(ny)) || isInBoothZone(Math.round(nx), Math.round(ny)));

  if (hitEdge || hitZone) {
    const tryDirs = [1, -1, 2].map((offset) => (char.dir + offset + 4) % 4);
    for (const d of tryDirs) {
      const tx = char.x + DIR_DX[d] * char.speed * dtFactor;
      const ty = char.y + DIR_DY[d] * char.speed * dtFactor;
      const tHitEdge = tx < -WALKABLE_HALF || tx > WALKABLE_HALF || ty < -WALKABLE_HALF || ty > WALKABLE_HALF;
      const tHitZone = avoidStage && (isInStageZone(Math.round(tx), Math.round(ty)) || isInBoothZone(Math.round(tx), Math.round(ty)));
      if (!tHitEdge && !tHitZone) {
        char.dir = d;
        char.x = tx;
        char.y = ty;
        char.stepsUntilTurn = randRange(80, 250);
        return;
      }
    }
    char.dir = (char.dir + 2) % 4;
    char.stepsUntilTurn = randRange(80, 250);
    return;
  }

  char.x = nx;
  char.y = ny;

  char.stepsUntilTurn -= dtFactor;
  if (char.stepsUntilTurn <= 0) {
    const turnChoice = pick([-1, 0, 1]);
    char.dir = (char.dir + turnChoice + 4) % 4;
    char.stepsUntilTurn = randRange(80, 250);
  }
}

/**
 * Process character interactions — proximity detection, state transitions.
 * Mutates characters in place. Called after stepping all characters.
 */
export function processInteractions(chars: Character[]): void {
  // 1. Handle chatting → departing transitions (needs partner positions for direction)
  for (const char of chars) {
    if (char.state === "chatting" && char.stateTimer <= 0) {
      const partner = chars.find((c) => c.id === char.interactionTarget);
      if (partner) {
        // Walk away from partner
        const dx = char.x - partner.x;
        const dy = char.y - partner.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          char.dir = dx > 0 ? 1 : 3; // East or West
        } else {
          char.dir = dy > 0 ? 2 : 0; // South or North
        }
      } else {
        // Partner not found, pick random direction
        char.dir = randRange(0, 3);
      }
      char.state = "departing";
      char.stateTimer = DEPARTING_MS;
      char.interactionTarget = null;
      char.interactionTargetName = null;
    }
  }

  // 2. Check for new proximity interactions between walking characters
  for (let i = 0; i < chars.length; i++) {
    const a = chars[i];
    if (a.state !== "walking" || a.cooldownTimer > 0) continue;

    for (let j = i + 1; j < chars.length; j++) {
      const b = chars[j];
      if (b.state !== "walking" || b.cooldownTimer > 0) continue;

      // Compute screen-space distance
      const isoA = gridToIso(a.x, a.y);
      const isoB = gridToIso(b.x, b.y);
      const dx = isoA.x - isoB.x;
      const dy = isoA.y - isoB.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < INTERACTION_DISTANCE) {
        // Start greeting
        a.state = "greeting";
        a.interactionTarget = b.id;
        a.interactionTargetName = b.name;
        a.stateTimer = GREETING_MS;

        b.state = "greeting";
        b.interactionTarget = a.id;
        b.interactionTargetName = a.name;
        b.stateTimer = GREETING_MS;

        // Break inner loop — character a is now paired
        break;
      }
    }
  }
}

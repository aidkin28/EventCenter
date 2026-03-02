/** Shared types for the isometric event center */

export interface Point {
  x: number;
  y: number;
}

export interface GridConfig {
  cols: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  originX: number;
  originY: number;
  characterCount: number;
}

export interface SkinTone {
  name: string;
  hex: string;
}

export interface ClothingStyle {
  name: string;
  jacket: string | null;
  shirt: string;
  tie: string | null;
  pants: string;
  hasJacket: boolean;
  hasTie: boolean;
  hasPattern?: boolean;
  isSweater?: boolean;
  isDress?: boolean;
  isSport?: boolean;
  isHoodie?: boolean;
}

export type CharacterState = "walking" | "greeting" | "chatting" | "departing";

export interface Character {
  id: number;
  name: string;
  gender: "male" | "female";
  skin: SkinTone;
  hair: string;
  clothing: ClothingStyle;
  /** Continuous floating-point grid position */
  x: number;
  y: number;
  /** 0=N, 1=E, 2=S, 3=W */
  dir: number;
  /** Continuously incrementing float — drives sin()-based leg/arm swing */
  walkCycle: number;
  /** Movement speed per normalized frame */
  speed: number;
  /** Frames remaining before picking a new direction */
  stepsUntilTurn: number;
  height: number;
  /** Current interaction state */
  state: CharacterState;
  /** ID of the character being interacted with */
  interactionTarget: number | null;
  /** Name of the interaction target (for speech bubble) */
  interactionTargetName: string | null;
  /** Time remaining in current state (ms) */
  stateTimer: number;
  /** Cooldown before can interact again (ms) */
  cooldownTimer: number;
  /** Buzzword topic shown when near the stage */
  stageTopic: string;
}

export interface BoothConfig {
  id: string;
  label: string;
  gridX: number;
  gridY: number;
  color: string;
  accentColor: string;
}

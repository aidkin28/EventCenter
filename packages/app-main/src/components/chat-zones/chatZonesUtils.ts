/** Zone configs, types, and constants for the Chat Zones feature */

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 900;

export interface ZoneConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UserPlacementData {
  id: string;
  userId: string;
  userName: string;
  zoneId: string;
  note: string;
  placedAt: number;
  /** Position within the zone (0-1 normalized) */
  offsetX: number;
  offsetY: number;
}

export const ZONES: ZoneConfig[] = [
  {
    id: "innovation-ai",
    name: "Innovation & AI",
    description: "Explore cutting-edge AI and emerging tech initiatives",
    color: "#2563EB",
    bgColor: "#EFF6FF",
    borderColor: "#93C5FD",
    x: 60,
    y: 60,
    width: 300,
    height: 220,
  },
  {
    id: "leadership-growth",
    name: "Leadership & Growth",
    description: "Share leadership insights and career growth tips",
    color: "#9333EA",
    bgColor: "#FAF5FF",
    borderColor: "#C4B5FD",
    x: 440,
    y: 40,
    width: 300,
    height: 200,
  },
  {
    id: "customer-experience",
    name: "Customer Experience",
    description: "Discuss strategies for enhancing client interactions",
    color: "#EA580C",
    bgColor: "#FFF7ED",
    borderColor: "#FDBA74",
    x: 820,
    y: 60,
    width: 300,
    height: 220,
  },
  {
    id: "digital-banking",
    name: "Digital Banking",
    description: "Digital transformation and fintech innovation",
    color: "#0891B2",
    bgColor: "#ECFEFF",
    borderColor: "#67E8F9",
    x: 100,
    y: 360,
    width: 280,
    height: 200,
  },
  {
    id: "wellness-culture",
    name: "Wellness & Culture",
    description: "Employee well-being, DEI, and workplace culture",
    color: "#16A34A",
    bgColor: "#F0FDF4",
    borderColor: "#86EFAC",
    x: 460,
    y: 320,
    width: 280,
    height: 220,
  },
  {
    id: "data-analytics",
    name: "Data & Analytics",
    description: "Data-driven insights and analytics best practices",
    color: "#DC2626",
    bgColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    x: 820,
    y: 360,
    width: 300,
    height: 200,
  },
  {
    id: "sustainability-esg",
    name: "Sustainability & ESG",
    description: "Environmental, social, and governance initiatives",
    color: "#65A30D",
    bgColor: "#F7FEE7",
    borderColor: "#BEF264",
    x: 350,
    y: 640,
    width: 500,
    height: 200,
  },
];

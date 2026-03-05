export interface DayRecapData {
  conference: string;
  day: number;
  date: string; // "Thursday, March 6"
  tagline: string;
  stats: {
    attendees: number;
    messages: number;
    connections: number;
    sessions: number;
    breakoutRooms: number;
    siaCommands: number;
  };
  energyCurve: { time: string; level: number; label: string }[];
  headlines: {
    session: string;
    headline: string;
    summary: string;
    room: string;
    messages: number;
    hot: boolean;
  }[];
  topQuotes: { text: string; author: string; reactions: number }[];
  mysteries: string[];
  awards: { emoji: string; title: string; detail: string }[];
  trending: { word: string; count: number }[];
  wordCloud: {
    word: string;
    weight: number;
    type: "trending" | "unique" | "common";
  }[];
  mindMap?: {
    groupName: string;
    nodeCount: number;
    nodes: {
      id: string;
      parentId: string | null;
      label: string;
    }[];
  };
  generatedAt: string;
}

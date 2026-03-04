export interface DayRecap {
  day: 1 | 2 | 3;
  summary: string;
  totalSessions: number;
  totalDurationMinutes: number;
  trackBreakdown: { track: string; count: number }[];
  mostUpvotedSession: { title: string; upvotes: number };
  mostViewedSession: { title: string; views: number };
  mostTalkativeSession: { title: string; commentCount: number };
}

export const DAY_RECAPS: DayRecap[] = [
  {
    day: 1,
    summary:
      "Day 1 set the strategic foundation with a powerful opening keynote, a deep dive into financial outlook, and an interactive workshop that aligned leadership on the top five priorities for the year ahead.",
    totalSessions: 5,
    totalDurationMinutes: 330,
    trackBreakdown: [
      { track: "Strategy", count: 3 },
      { track: "Technology", count: 1 },
      { track: "Leadership", count: 1 },
    ],
    mostUpvotedSession: {
      title: "Opening Keynote: State of the Business",
      upvotes: 47,
    },
    mostViewedSession: {
      title: "Technology Roadmap 2027",
      views: 312,
    },
    mostTalkativeSession: {
      title: "Workshop: Strategic Priorities Alignment",
      commentCount: 63,
    },
  },
  {
    day: 2,
    summary:
      "Day 2 shifted focus to innovation and execution. Teams explored practical AI applications, tackled brand evolution, and participated in a high-energy cross-functional innovation sprint that produced three viable pilot proposals.",
    totalSessions: 5,
    totalDurationMinutes: 330,
    trackBreakdown: [
      { track: "Innovation", count: 2 },
      { track: "Strategy", count: 2 },
      { track: "Technology", count: 1 },
    ],
    mostUpvotedSession: {
      title: "AI in the Enterprise: Practical Applications",
      upvotes: 52,
    },
    mostViewedSession: {
      title: "The Innovation Imperative",
      views: 287,
    },
    mostTalkativeSession: {
      title: "Workshop: Cross-Functional Innovation Sprint",
      commentCount: 78,
    },
  },
  {
    day: 3,
    summary:
      "The final day brought it all together with sessions on people strategy, team building, and a closing keynote that synthesized three days of insights into a unified roadmap. Every leadership team left with a concrete 90-day action plan.",
    totalSessions: 5,
    totalDurationMinutes: 330,
    trackBreakdown: [
      { track: "Strategy", count: 2 },
      { track: "Leadership", count: 2 },
      { track: "Culture", count: 1 },
    ],
    mostUpvotedSession: {
      title: "Closing Keynote: The Road Ahead",
      upvotes: 58,
    },
    mostViewedSession: {
      title: "Building High-Performance Teams",
      views: 298,
    },
    mostTalkativeSession: {
      title: "Workshop: 90-Day Action Planning",
      commentCount: 71,
    },
  },
];

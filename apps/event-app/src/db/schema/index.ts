/**
 * Drizzle Schema - Auth + Networking export for event-app
 */

// Auth tables
export {
  users,
  accounts,
  sessions,
  verifications,
  twoFactors,
  twoFactorSettings,
  loginHistory,
} from "./auth";

// Networking tables
export {
  networkingGroups,
  networkingGroupMembers,
  networkingMessages,
  networkingMindMapNodes,
} from "./networking";

// Speakers
export { speakers } from "./speakers";

// Sessions
export {
  trackEnum,
  eventSessions,
  sessionSpeakers,
  sessionUpvotes,
  sessionComments,
} from "./sessions";

// Attendees
export { attendees } from "./attendees";

// Events
export { events, eventAttendees } from "./events";

// All relations
export * from "./relations";

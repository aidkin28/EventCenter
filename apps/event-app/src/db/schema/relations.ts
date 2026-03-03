/**
 * Drizzle ORM Relations — Auth + Networking for event-app
 */
import { relations } from "drizzle-orm";

import {
  users,
  accounts,
  sessions,
  twoFactors,
  twoFactorSettings,
  loginHistory,
} from "./auth";

import {
  networkingGroups,
  networkingGroupMembers,
  networkingMessages,
  networkingMindMapNodes,
} from "./networking";

// ============================================
// USER RELATIONS
// ============================================

export const usersRelations = relations(users, ({ one, many }) => ({
  // Better Auth relations
  accounts: many(accounts),
  sessions: many(sessions),

  // 2FA relations
  twoFactor: one(twoFactors, {
    fields: [users.id],
    references: [twoFactors.userId],
  }),
  twoFactorSettings: one(twoFactorSettings, {
    fields: [users.id],
    references: [twoFactorSettings.userId],
  }),

  // Login history
  loginHistory: many(loginHistory),

  // Networking
  createdNetworkingGroups: many(networkingGroups),
  networkingMemberships: many(networkingGroupMembers),
  networkingMessages: many(networkingMessages),
  networkingMindMapNodes: many(networkingMindMapNodes),
}));

// ============================================
// BETTER AUTH RELATIONS
// ============================================

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// ============================================
// 2FA RELATIONS
// ============================================

export const twoFactorsRelations = relations(twoFactors, ({ one }) => ({
  user: one(users, {
    fields: [twoFactors.userId],
    references: [users.id],
  }),
}));

export const twoFactorSettingsRelations = relations(twoFactorSettings, ({ one }) => ({
  user: one(users, {
    fields: [twoFactorSettings.userId],
    references: [users.id],
  }),
}));

export const loginHistoryRelations = relations(loginHistory, ({ one }) => ({
  user: one(users, {
    fields: [loginHistory.userId],
    references: [users.id],
  }),
}));

// ============================================
// NETWORKING RELATIONS
// ============================================

export const networkingGroupsRelations = relations(networkingGroups, ({ one, many }) => ({
  creator: one(users, {
    fields: [networkingGroups.creatorId],
    references: [users.id],
  }),
  members: many(networkingGroupMembers),
  messages: many(networkingMessages),
  mindMapNodes: many(networkingMindMapNodes),
}));

export const networkingGroupMembersRelations = relations(networkingGroupMembers, ({ one }) => ({
  group: one(networkingGroups, {
    fields: [networkingGroupMembers.groupId],
    references: [networkingGroups.id],
  }),
  user: one(users, {
    fields: [networkingGroupMembers.userId],
    references: [users.id],
  }),
}));

export const networkingMessagesRelations = relations(networkingMessages, ({ one }) => ({
  group: one(networkingGroups, {
    fields: [networkingMessages.groupId],
    references: [networkingGroups.id],
  }),
  user: one(users, {
    fields: [networkingMessages.userId],
    references: [users.id],
  }),
}));

export const networkingMindMapNodesRelations = relations(networkingMindMapNodes, ({ one }) => ({
  group: one(networkingGroups, {
    fields: [networkingMindMapNodes.groupId],
    references: [networkingGroups.id],
  }),
  createdBy: one(users, {
    fields: [networkingMindMapNodes.createdByUserId],
    references: [users.id],
  }),
}));

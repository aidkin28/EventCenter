CREATE TABLE "account" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"accountId" varchar(255) NOT NULL,
	"providerId" varchar(255) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"icon" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"criteria" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"admin_id" varchar(255) NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"setting_value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_settings_admin_key_unique" UNIQUE("admin_id","setting_key")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"resource_id" varchar(255),
	"details" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"chat_session_id" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"team_id" varchar(255),
	"update_period" varchar(50) NOT NULL,
	"period_date" date NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"daily_update_id" varchar(255),
	CONSTRAINT "chat_sessions_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "chat_sessions_daily_update_id_unique" UNIQUE("daily_update_id")
);
--> statement-breakpoint
CREATE TABLE "daily_updates" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"user_goal_set_id" varchar(255),
	"update_text" text NOT NULL,
	"team_id" varchar(255),
	"update_period" varchar(50) NOT NULL,
	"period_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expert_reviews" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"goal_id" varchar(255) NOT NULL,
	"expert_id" varchar(50) NOT NULL,
	"expert_name" varchar(100) NOT NULL,
	"review_content" text NOT NULL,
	"action_items" text,
	"score" integer,
	"feedback" text,
	"suggestions" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_activities" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"daily_update_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"team_id" varchar(255),
	"activity_type" varchar(50) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"summary" text NOT NULL,
	"activity_date" date NOT NULL,
	"period" varchar(50) NOT NULL,
	"linked_goal_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_expert_selections" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"goal_id" varchar(255) NOT NULL,
	"expert_id" varchar(50) NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "goal_expert_selections_goal_expert_unique" UNIQUE("goal_id","expert_id")
);
--> statement-breakpoint
CREATE TABLE "goal_guides" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_by" varchar(255),
	"title" varchar(255) NOT NULL,
	"description" text,
	"guide_type" varchar(50) NOT NULL,
	"content" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"applies_to_user_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_progress_estimates" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"goal_id" varchar(255) NOT NULL,
	"unit" varchar(100) NOT NULL,
	"estimated_per_day" numeric(10, 2) NOT NULL,
	"estimated_per_week" numeric(10, 2) NOT NULL,
	"set_by" varchar(50) DEFAULT 'expert' NOT NULL,
	"modified_by" varchar(255),
	"modified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_updates" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"goal_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"raw_text" text NOT NULL,
	"parsed_data" jsonb,
	"sentiment" varchar(50),
	"momentum_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_goal_set_id" varchar(255),
	"user_id" varchar(255),
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"goal_text" text,
	"goal_order" integer,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"target_date" timestamp,
	"validation_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"validation_feedback" text,
	"expert_summary" text,
	"council_score" numeric(3, 1),
	"council_reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_history" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text,
	"event" varchar(50) DEFAULT 'login' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"progress_reminder_enabled" boolean DEFAULT true NOT NULL,
	"progress_threshold_percent" integer DEFAULT 50 NOT NULL,
	"daily_reminder_enabled" boolean DEFAULT true NOT NULL,
	"daily_reminder_time" varchar(5) DEFAULT '09:00' NOT NULL,
	"weekly_summary_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" varchar(255) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" varchar(255) NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "team_event_attendees" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"response_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"team_id" varchar(255) NOT NULL,
	"created_by_id" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"location" varchar(500),
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"availability" varchar(50) DEFAULT 'busy' NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"series_id" varchar(255),
	"is_series" boolean DEFAULT false NOT NULL,
	"repeat_every_days" integer,
	"skip_weekends" boolean DEFAULT false NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"team_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"invited_by" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"team_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_team_user_unique" UNIQUE("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor_settings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"mode" varchar(50) DEFAULT 'each_time' NOT NULL,
	"trusted_ips" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "two_factor_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"secret" text,
	"backup_codes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "two_factor_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "update_follow_ups" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"chat_session_id" varchar(255) NOT NULL,
	"extracted_activity_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"team_id" varchar(255),
	"title" varchar(255) NOT NULL,
	"summary" text NOT NULL,
	"activity_type" varchar(50),
	"status" varchar(50) DEFAULT 'confirmed' NOT NULL,
	"due_date" date,
	"completed_at" timestamp,
	"completed_in_session_id" varchar(255),
	"linked_event_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"achievement_id" varchar(255) NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievements_user_achievement_unique" UNIQUE("user_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "user_goal_sets" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"approved_by" varchar(255),
	"approved_at" timestamp,
	"admin_comment" text,
	"editable_until" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_todos" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"streak_current" integer DEFAULT 0 NOT NULL,
	"streak_longest" integer DEFAULT 0 NOT NULL,
	"streak_last_update" timestamp,
	"total_points" integer DEFAULT 0 NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"twoFactorEnabled" boolean DEFAULT false,
	"last_two_factor_at" timestamp,
	"session_timeout_hours" integer,
	"two_factor_attempts" integer DEFAULT 0 NOT NULL,
	"two_factor_locked_until" timestamp,
	"active_team_id" varchar(255),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_session_id_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_daily_update_id_daily_updates_id_fk" FOREIGN KEY ("daily_update_id") REFERENCES "public"."daily_updates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_updates" ADD CONSTRAINT "daily_updates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_updates" ADD CONSTRAINT "daily_updates_user_goal_set_id_user_goal_sets_id_fk" FOREIGN KEY ("user_goal_set_id") REFERENCES "public"."user_goal_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_updates" ADD CONSTRAINT "daily_updates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert_reviews" ADD CONSTRAINT "expert_reviews_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_activities" ADD CONSTRAINT "extracted_activities_daily_update_id_daily_updates_id_fk" FOREIGN KEY ("daily_update_id") REFERENCES "public"."daily_updates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_activities" ADD CONSTRAINT "extracted_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_activities" ADD CONSTRAINT "extracted_activities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_activities" ADD CONSTRAINT "extracted_activities_linked_goal_id_goals_id_fk" FOREIGN KEY ("linked_goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_expert_selections" ADD CONSTRAINT "goal_expert_selections_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_guides" ADD CONSTRAINT "goal_guides_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_guides" ADD CONSTRAINT "goal_guides_applies_to_user_id_users_id_fk" FOREIGN KEY ("applies_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress_estimates" ADD CONSTRAINT "goal_progress_estimates_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress_estimates" ADD CONSTRAINT "goal_progress_estimates_modified_by_users_id_fk" FOREIGN KEY ("modified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_updates" ADD CONSTRAINT "goal_updates_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_updates" ADD CONSTRAINT "goal_updates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_goal_set_id_user_goal_sets_id_fk" FOREIGN KEY ("user_goal_set_id") REFERENCES "public"."user_goal_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_event_attendees" ADD CONSTRAINT "team_event_attendees_event_id_team_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."team_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_event_attendees" ADD CONSTRAINT "team_event_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_events" ADD CONSTRAINT "team_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_events" ADD CONSTRAINT "team_events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor_settings" ADD CONSTRAINT "two_factor_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_follow_ups" ADD CONSTRAINT "update_follow_ups_chat_session_id_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_follow_ups" ADD CONSTRAINT "update_follow_ups_extracted_activity_id_extracted_activities_id_fk" FOREIGN KEY ("extracted_activity_id") REFERENCES "public"."extracted_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_follow_ups" ADD CONSTRAINT "update_follow_ups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_follow_ups" ADD CONSTRAINT "update_follow_ups_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_follow_ups" ADD CONSTRAINT "update_follow_ups_linked_event_id_team_events_id_fk" FOREIGN KEY ("linked_event_id") REFERENCES "public"."team_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_goal_sets" ADD CONSTRAINT "user_goal_sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_goal_sets" ADD CONSTRAINT "user_goal_sets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_todos" ADD CONSTRAINT "user_todos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_user_id_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource","resource_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages" USING btree ("chat_session_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_period_date_idx" ON "chat_sessions" USING btree ("period_date");--> statement-breakpoint
CREATE INDEX "chat_sessions_team_id_idx" ON "chat_sessions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "daily_updates_user_period_idx" ON "daily_updates" USING btree ("user_id","period_date");--> statement-breakpoint
CREATE INDEX "daily_updates_team_id_idx" ON "daily_updates" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "extracted_activities_user_date_idx" ON "extracted_activities" USING btree ("user_id","activity_date");--> statement-breakpoint
CREATE INDEX "extracted_activities_type_idx" ON "extracted_activities" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "extracted_activities_team_id_idx" ON "extracted_activities" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "goal_updates_goal_id_idx" ON "goal_updates" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_updates_user_id_idx" ON "goal_updates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "goals_user_goal_set_id_idx" ON "goals" USING btree ("user_goal_set_id");--> statement-breakpoint
CREATE INDEX "goals_user_id_idx" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "goals_status_idx" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "login_history_user_id_idx" ON "login_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_history_created_at_idx" ON "login_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "team_event_attendees_event_id_idx" ON "team_event_attendees" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "team_event_attendees_user_id_idx" ON "team_event_attendees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_events_team_id_idx" ON "team_events" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_events_start_date_idx" ON "team_events" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "team_events_series_id_idx" ON "team_events" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "team_events_created_by_id_idx" ON "team_events" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "team_invitations_email_idx" ON "team_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "team_invitations_team_id_idx" ON "team_invitations" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_members_team_id_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_members_user_id_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "update_follow_ups_user_status_idx" ON "update_follow_ups" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "update_follow_ups_session_id_idx" ON "update_follow_ups" USING btree ("chat_session_id");--> statement-breakpoint
CREATE INDEX "update_follow_ups_team_status_idx" ON "update_follow_ups" USING btree ("team_id","status");--> statement-breakpoint
CREATE INDEX "update_follow_ups_linked_event_idx" ON "update_follow_ups" USING btree ("linked_event_id");--> statement-breakpoint
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_goal_sets_user_id_idx" ON "user_goal_sets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_goal_sets_status_idx" ON "user_goal_sets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_todos_user_status_idx" ON "user_todos" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "user_todos_user_order_idx" ON "user_todos" USING btree ("user_id","sort_order");
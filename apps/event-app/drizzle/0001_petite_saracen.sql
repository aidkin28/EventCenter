CREATE TYPE "public"."track" AS ENUM('Leadership', 'Technology', 'Strategy', 'Innovation', 'Culture');--> statement-breakpoint
CREATE TABLE "attendees" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"title" varchar(255),
	"image_url" text,
	"initials" varchar(10),
	"user_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_attendees" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"attendee_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"event_id" varchar(255),
	"title" varchar(500) NOT NULL,
	"description" text,
	"date" date NOT NULL,
	"start_time" varchar(10) NOT NULL,
	"end_time" varchar(10) NOT NULL,
	"location" varchar(500),
	"track" "track",
	"tags" jsonb DEFAULT '[]'::jsonb,
	"viewer_ids" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"venue" varchar(500),
	"location" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_comments" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_speakers" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"speaker_id" varchar(255) NOT NULL,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_upvotes" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speakers" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"company" varchar(255) DEFAULT 'Scotiabank',
	"bio" text NOT NULL,
	"image_url" text DEFAULT '',
	"initials" varchar(10) NOT NULL,
	"user_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "networking_groups" ADD COLUMN "insights" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_comments" ADD CONSTRAINT "session_comments_session_id_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."event_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_comments" ADD CONSTRAINT "session_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_speakers" ADD CONSTRAINT "session_speakers_session_id_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."event_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_speakers" ADD CONSTRAINT "session_speakers_speaker_id_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_upvotes" ADD CONSTRAINT "session_upvotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_upvotes" ADD CONSTRAINT "session_upvotes_session_id_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."event_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speakers" ADD CONSTRAINT "speakers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendees_user_id_idx" ON "attendees" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_attendees_event_attendee_idx" ON "event_attendees" USING btree ("event_id","attendee_id");--> statement-breakpoint
CREATE INDEX "event_attendees_event_id_idx" ON "event_attendees" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_attendees_attendee_id_idx" ON "event_attendees" USING btree ("attendee_id");--> statement-breakpoint
CREATE INDEX "event_sessions_date_idx" ON "event_sessions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "event_sessions_track_idx" ON "event_sessions" USING btree ("track");--> statement-breakpoint
CREATE INDEX "event_sessions_event_id_idx" ON "event_sessions" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_start_date_idx" ON "events" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "session_comments_session_id_idx" ON "session_comments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_comments_user_id_idx" ON "session_comments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_speakers_session_speaker_idx" ON "session_speakers" USING btree ("session_id","speaker_id");--> statement-breakpoint
CREATE INDEX "session_speakers_session_id_idx" ON "session_speakers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_speakers_speaker_id_idx" ON "session_speakers" USING btree ("speaker_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_upvotes_user_session_idx" ON "session_upvotes" USING btree ("user_id","session_id");--> statement-breakpoint
CREATE INDEX "session_upvotes_session_id_idx" ON "session_upvotes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_upvotes_user_id_idx" ON "session_upvotes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "speakers_user_id_idx" ON "speakers" USING btree ("user_id");
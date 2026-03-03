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
CREATE TABLE "login_history" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text,
	"event" varchar(50) DEFAULT 'login' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "networking_group_members" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"group_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "networking_group_members_unique" UNIQUE("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "networking_groups" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"creator_id" varchar(255) NOT NULL,
	"top_words" jsonb DEFAULT '[]'::jsonb,
	"member_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "networking_messages" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"group_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"is_ai_summary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "networking_mind_map_nodes" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"group_id" varchar(255) NOT NULL,
	"parent_id" varchar(255),
	"label" varchar(200) NOT NULL,
	"position_x" real DEFAULT 0 NOT NULL,
	"position_y" real DEFAULT 0 NOT NULL,
	"created_by_user_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
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
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "networking_group_members" ADD CONSTRAINT "networking_group_members_group_id_networking_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."networking_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "networking_group_members" ADD CONSTRAINT "networking_group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "networking_groups" ADD CONSTRAINT "networking_groups_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "networking_messages" ADD CONSTRAINT "networking_messages_group_id_networking_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."networking_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "networking_messages" ADD CONSTRAINT "networking_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "networking_mind_map_nodes" ADD CONSTRAINT "networking_mind_map_nodes_group_id_networking_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."networking_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "networking_mind_map_nodes" ADD CONSTRAINT "networking_mind_map_nodes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor_settings" ADD CONSTRAINT "two_factor_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_history_user_id_idx" ON "login_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_history_created_at_idx" ON "login_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "networking_group_members_group_id_idx" ON "networking_group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "networking_group_members_user_id_idx" ON "networking_group_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "networking_groups_creator_id_idx" ON "networking_groups" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "networking_groups_created_at_idx" ON "networking_groups" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "networking_messages_group_id_idx" ON "networking_messages" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "networking_messages_created_at_idx" ON "networking_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "networking_messages_group_created_idx" ON "networking_messages" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "networking_mind_map_nodes_group_id_idx" ON "networking_mind_map_nodes" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "networking_mind_map_nodes_parent_id_idx" ON "networking_mind_map_nodes" USING btree ("parent_id");
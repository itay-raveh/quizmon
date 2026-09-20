CREATE TABLE "email_budget" (
	"id" text PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"cycle" text NOT NULL,
	"daily_count" integer NOT NULL,
	"cycle_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_mailbox" (
	"email" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp,
	"alg" text,
	"crv" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_state" (
	"id" text PRIMARY KEY NOT NULL,
	"generation_id" uuid NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"projection_version" integer DEFAULT 1 NOT NULL,
	"profile_created_at" text DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD') NOT NULL,
	"progress" jsonb NOT NULL,
	"edits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"edit_revisions" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "completion_facts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"generation_id" uuid NOT NULL,
	"completion_id" uuid NOT NULL,
	"dataset_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"completion" jsonb NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"record_version" integer NOT NULL,
	"progress_version" integer NOT NULL,
	"mode" text NOT NULL,
	"daily_date" text,
	"score_version" integer NOT NULL,
	"content_version" integer NOT NULL,
	"generator_version" integer,
	"contribution" jsonb NOT NULL,
	"eligible" boolean NOT NULL,
	"revision" integer NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "completion_identity" UNIQUE("owner_id","generation_id","completion_id"),
	CONSTRAINT "completion_mode" CHECK ("completion_facts"."mode" IN ('daily', 'training', 'league')),
	CONSTRAINT "completion_date" CHECK (("completion_facts"."mode" = 'daily') = ("completion_facts"."daily_date" IS NOT NULL)),
	CONSTRAINT "completion_record_version" CHECK ("completion_facts"."record_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "daily_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"generation_id" uuid NOT NULL,
	"date" text NOT NULL,
	"score" integer NOT NULL,
	"elapsed_milliseconds" integer NOT NULL,
	"completion_id" uuid NOT NULL,
	"result" jsonb NOT NULL,
	"streak_credit" boolean NOT NULL,
	CONSTRAINT "daily_score" CHECK ("daily_results"."score" >= 0 AND "daily_results"."elapsed_milliseconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "linked_datasets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"generation_id" uuid NOT NULL,
	"link_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operation_outcomes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"generation_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"outcome" jsonb NOT NULL,
	"effect" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_pokemon" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"generation_id" uuid NOT NULL,
	"pokemon" text NOT NULL,
	"discovered" boolean NOT NULL,
	"correct" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_state" (
	"id" text PRIMARY KEY NOT NULL,
	"epoch" uuid NOT NULL,
	"fenced" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_issues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"generation_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"payload" jsonb NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friend_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_low" text NOT NULL,
	"user_high" text NOT NULL,
	"sender_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friend_request_pair_order" CHECK ("friend_requests"."user_low" COLLATE "C" < "friend_requests"."user_high" COLLATE "C"),
	CONSTRAINT "friend_request_sender" CHECK ("friend_requests"."sender_id" IN ("friend_requests"."user_low", "friend_requests"."user_high")),
	CONSTRAINT "friend_request_status" CHECK ("friend_requests"."status" IN ('pending', 'accepted', 'declined', 'cancelled', 'removed'))
);
--> statement-breakpoint
CREATE TABLE "social_players" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	CONSTRAINT "social_players_code_unique" UNIQUE("code"),
	CONSTRAINT "social_player_code" CHECK ("social_players"."code" ~ '^[A-F0-9]{16}$')
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_state" ADD CONSTRAINT "account_state_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion_facts" ADD CONSTRAINT "completion_facts_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_results" ADD CONSTRAINT "daily_results_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_results" ADD CONSTRAINT "daily_results_owner_id_generation_id_completion_id_completion_facts_owner_id_generation_id_completion_id_fk" FOREIGN KEY ("owner_id","generation_id","completion_id") REFERENCES "public"."completion_facts"("owner_id","generation_id","completion_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_datasets" ADD CONSTRAINT "linked_datasets_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_outcomes" ADD CONSTRAINT "operation_outcomes_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_pokemon" ADD CONSTRAINT "player_pokemon_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_issues" ADD CONSTRAINT "sync_issues_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_user_low_user_id_fk" FOREIGN KEY ("user_low") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_user_high_user_id_fk" FOREIGN KEY ("user_high") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_players" ADD CONSTRAINT "social_players_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "daily_ranking" ON "daily_results" USING btree ("date","score" DESC NULLS LAST,"elapsed_milliseconds");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_identity" ON "daily_results" USING btree ("owner_id","generation_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "operation_identity" ON "operation_outcomes" USING btree ("owner_id","generation_id","operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_pokemon_identity" ON "player_pokemon" USING btree ("owner_id","generation_id","pokemon");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_identity" ON "sync_issues" USING btree ("owner_id","generation_id","operation_id");--> statement-breakpoint
CREATE INDEX "issues_owner" ON "sync_issues" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friend_request_active_pair" ON "friend_requests" USING btree ("user_low","user_high") WHERE "friend_requests"."status" IN ('pending', 'accepted');--> statement-breakpoint
CREATE INDEX "friend_request_low_status" ON "friend_requests" USING btree ("user_low","status","id");--> statement-breakpoint
CREATE INDEX "friend_request_high_status" ON "friend_requests" USING btree ("user_high","status","id");

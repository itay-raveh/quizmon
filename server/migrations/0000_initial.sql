CREATE TABLE "dataset" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friend" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friend_distinct" CHECK ("friend"."from_id" <> "friend"."to_id"),
	CONSTRAINT "friend_status" CHECK ("friend"."status" IN ('pending','accepted','declined','cancelled','removed'))
);
--> statement-breakpoint
CREATE TABLE "instance" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"epoch" uuid NOT NULL,
	CONSTRAINT "instance_singleton" CHECK ("instance"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "mail_budget" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"day" date NOT NULL,
	"day_count" integer DEFAULT 0 NOT NULL,
	"cycle" text NOT NULL,
	"cycle_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "mail_budget_singleton" CHECK ("mail_budget"."id" = 1),
	CONSTRAINT "mail_budget_counts" CHECK ("mail_budget"."day_count" >= 0 AND "mail_budget"."cycle_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "op" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL,
	"hash" text NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	CONSTRAINT "op_status" CHECK ("op"."status" IN ('accepted','rejected'))
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"joined_on" date DEFAULT CURRENT_DATE NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"avatar" text,
	"partner" text,
	"specialty" text,
	"answer_flow" text DEFAULT 'manual' NOT NULL,
	"timer_display" text DEFAULT 'seconds' NOT NULL,
	"training_mode" text DEFAULT 'league' NOT NULL,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"question_selection" text DEFAULT 'automatic' NOT NULL,
	"generations" text[] DEFAULT '{"I"}' NOT NULL,
	"form_groups" text[] DEFAULT '{"standard","regional","mega","gigantamax"}' NOT NULL,
	"question_types" text[] DEFAULT '{"item-identification","medicine-cabinet","evolution-items","weight-comparison","height-comparison","move-types","name-that-region","move-purpose","pokedex-categories","evolution-conditions","ability-effects","held-item-effects","hidden-abilities","nature-effects","ev-yields","encounter-locations","berry-flavors","natural-gift","pokedex-scan","silhouette-match","sprite-match","whos-that-pokemon","pixel-peek","shiny-spotter","field-notes","type-check","odd-one-out","type-roundup","type-twins","legend-hunt","generation-roundup","evolution-link","evolution-shift","ability-check","move-check","stat-showdown","type-matchup","counter-pick"}' NOT NULL,
	"auto_types" text[],
	CONSTRAINT "player_code_unique" UNIQUE("code"),
	CONSTRAINT "player_code_format" CHECK ("player"."code" ~ '^[A-F0-9]{16}$'),
	CONSTRAINT "player_name_length" CHECK (length("player"."name") <= 20),
	CONSTRAINT "player_difficulty" CHECK ("player"."difficulty" BETWEEN 1 AND 5),
	CONSTRAINT "player_answer_flow" CHECK ("player"."answer_flow" IN ('manual','auto','instant')),
	CONSTRAINT "player_timer_display" CHECK ("player"."timer_display" IN ('hidden','seconds','milliseconds')),
	CONSTRAINT "player_training_mode" CHECK ("player"."training_mode" IN ('league','custom')),
	CONSTRAINT "player_question_selection" CHECK ("player"."question_selection" IN ('automatic','custom'))
);
--> statement-breakpoint
CREATE TABLE "round" (
	"id" uuid PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL,
	"mode" text NOT NULL,
	"day" date,
	"puzzle_id" text,
	"started_on" date,
	"completed_at" timestamp with time zone NOT NULL,
	"credited" boolean NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "round_mode" CHECK ("round"."mode" IN ('training','daily','league')),
	CONSTRAINT "round_daily_fields" CHECK (CASE WHEN "round"."mode" = 'daily' THEN "round"."day" IS NOT NULL AND "round"."puzzle_id" IS NOT NULL AND "round"."started_on" IS NOT NULL ELSE "round"."day" IS NULL AND "round"."puzzle_id" IS NULL AND "round"."started_on" IS NULL END),
	CONSTRAINT "round_other_credited" CHECK ("round"."mode" = 'daily' OR "round"."credited")
);
--> statement-breakpoint
CREATE TABLE "round_score" (
	"round_id" uuid PRIMARY KEY NOT NULL,
	"score" integer NOT NULL,
	"elapsed_ms" integer NOT NULL,
	CONSTRAINT "round_score_nonnegative" CHECK ("round_score"."score" >= 0 AND "round_score"."elapsed_ms" >= 0)
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
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_player_id_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend" ADD CONSTRAINT "friend_from_id_user_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend" ADD CONSTRAINT "friend_to_id_user_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "op" ADD CONSTRAINT "op_player_id_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round" ADD CONSTRAINT "round_player_id_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_score" ADD CONSTRAINT "round_score_round_id_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."round"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "friend_active_pair" ON "friend" USING btree (least("from_id", "to_id"),greatest("from_id", "to_id")) WHERE "friend"."status" IN ('pending','accepted');--> statement-breakpoint
CREATE INDEX "friend_from" ON "friend" USING btree ("from_id","id");--> statement-breakpoint
CREATE INDEX "friend_to" ON "friend" USING btree ("to_id","id");--> statement-breakpoint
CREATE INDEX "round_history" ON "round" USING btree ("player_id","completed_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "round_daily_board" ON "round" USING btree ("day","puzzle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "round_credited_daily" ON "round" USING btree ("player_id","day") WHERE "round"."mode" = 'daily' AND "round"."credited";--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");

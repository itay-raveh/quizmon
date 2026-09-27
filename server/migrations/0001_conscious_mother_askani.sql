DROP TRIGGER IF EXISTS quizmon_alpha_progress_write_gate ON public.player;--> statement-breakpoint
DROP TRIGGER IF EXISTS quizmon_alpha_progress_write_gate ON public.round;--> statement-breakpoint
DROP FUNCTION IF EXISTS public.quizmon_alpha_reject_progress_write();--> statement-breakpoint
ALTER TABLE "dataset" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "instance" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "op" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "round" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "round_score" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "dataset" CASCADE;--> statement-breakpoint
DROP TABLE "instance" CASCADE;--> statement-breakpoint
DROP TABLE "op" CASCADE;--> statement-breakpoint
DROP TABLE "round" CASCADE;--> statement-breakpoint
DROP TABLE "round_score" CASCADE;--> statement-breakpoint
ALTER TABLE "player" DROP CONSTRAINT "player_name_length";--> statement-breakpoint
ALTER TABLE "player" DROP CONSTRAINT "player_difficulty";--> statement-breakpoint
ALTER TABLE "player" DROP CONSTRAINT "player_answer_flow";--> statement-breakpoint
ALTER TABLE "player" DROP CONSTRAINT "player_timer_display";--> statement-breakpoint
ALTER TABLE "player" DROP CONSTRAINT "player_training_mode";--> statement-breakpoint
ALTER TABLE "player" DROP CONSTRAINT "player_question_selection";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "joined_on";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "avatar";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "partner";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "specialty";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "answer_flow";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "timer_display";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "training_mode";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "difficulty";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "question_selection";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "generations";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "form_groups";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "question_types";--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "auto_types";

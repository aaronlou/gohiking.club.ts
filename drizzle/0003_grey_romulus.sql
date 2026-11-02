CREATE TYPE "public"."activity_join_policy" AS ENUM('approval', 'open', 'invite');--> statement-breakpoint
CREATE TYPE "public"."activity_member_status" AS ENUM('pending', 'approved', 'rejected', 'left', 'removed');--> statement-breakpoint
CREATE TYPE "public"."activity_role" AS ENUM('host', 'member');--> statement-breakpoint
CREATE TYPE "public"."activity_status" AS ENUM('draft', 'open', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."activity_visibility" AS ENUM('listed', 'unlisted', 'private');--> statement-breakpoint
ALTER TYPE "public"."photo_status" ADD VALUE 'unrated' BEFORE 'evaluating';--> statement-breakpoint
ALTER TYPE "public"."photo_visibility" ADD VALUE 'activity';--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"host_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"description" text,
	"region" text,
	"route_name" text,
	"meeting_point" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"difficulty" text DEFAULT 'moderate' NOT NULL,
	"capacity" integer,
	"join_policy" "activity_join_policy" DEFAULT 'approval' NOT NULL,
	"visibility" "activity_visibility" DEFAULT 'listed' NOT NULL,
	"status" "activity_status" DEFAULT 'open' NOT NULL,
	"cover_mode" text DEFAULT 'type' NOT NULL,
	"cover_color" text,
	"cover_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "activity_role" DEFAULT 'member' NOT NULL,
	"status" "activity_member_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" text
);
--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "activity_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_members" ADD CONSTRAINT "activity_members_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_members" ADD CONSTRAINT "activity_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_members" ADD CONSTRAINT "activity_members_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activities_slug_unique" ON "activities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "activities_host_id_idx" ON "activities" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "activities_start_date_idx" ON "activities" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "activities_status_idx" ON "activities" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_members_unique" ON "activity_members" USING btree ("activity_id","user_id");--> statement-breakpoint
CREATE INDEX "activity_members_user_idx" ON "activity_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_members_activity_status_idx" ON "activity_members" USING btree ("activity_id","status");--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photos_activity_id_idx" ON "photos" USING btree ("activity_id");
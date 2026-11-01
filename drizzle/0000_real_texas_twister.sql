CREATE TYPE "public"."photo_status" AS ENUM('evaluating', 'accepted', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."photo_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cameras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"serial" text NOT NULL,
	"body_color" text NOT NULL,
	"accent_color" text NOT NULL,
	"lens" text NOT NULL,
	"film_stock" text NOT NULL,
	"strap" text NOT NULL,
	"engraving" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"user_id" text NOT NULL,
	"photo_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "likes_user_id_photo_id_pk" PRIMARY KEY("user_id","photo_id")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"camera_id" uuid,
	"title" text NOT NULL,
	"caption" text,
	"status" "photo_status" DEFAULT 'evaluating' NOT NULL,
	"visibility" "photo_visibility" DEFAULT 'public' NOT NULL,
	"theme" text DEFAULT 'trail' NOT NULL,
	"score" numeric(2, 1),
	"ai_summary" text,
	"ai_strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_improvements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_model" text,
	"ai_provider" text,
	"ai_theme" text,
	"taken_at" timestamp with time zone,
	"location_name" text,
	"latitude" real,
	"longitude" real,
	"camera_model" text,
	"lens_model" text,
	"aperture" text,
	"shutter_speed" text,
	"iso" integer,
	"focal_length" text,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"file_key" text,
	"thumb_key" text,
	"blur_data" text,
	"dominant_color" text,
	"source" text DEFAULT 'upload' NOT NULL,
	"credit_name" text,
	"credit_url" text,
	"featured" boolean DEFAULT false NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evaluated_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text NOT NULL,
	"bio" text,
	"home_base" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_camera_id_cameras_id_fk" FOREIGN KEY ("camera_id") REFERENCES "public"."cameras"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cameras_serial_unique" ON "cameras" USING btree ("serial");--> statement-breakpoint
CREATE INDEX "cameras_user_id_idx" ON "cameras" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "likes_photo_id_idx" ON "likes" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX "photos_user_id_idx" ON "photos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "photos_status_idx" ON "photos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "photos_accepted_at_idx" ON "photos" USING btree ("accepted_at");--> statement-breakpoint
CREATE INDEX "photos_theme_idx" ON "photos" USING btree ("theme");--> statement-breakpoint
CREATE INDEX "photos_created_at_idx" ON "photos" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_unique" ON "user" USING btree ("username");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
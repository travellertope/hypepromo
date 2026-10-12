CREATE TYPE "public"."social_verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
ALTER TABLE "creator_socials" ADD COLUMN "screenshot_url" text;--> statement-breakpoint
ALTER TABLE "creator_socials" ADD COLUMN "verification_status" "social_verification_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_socials" ADD COLUMN "rejection_reason" text;

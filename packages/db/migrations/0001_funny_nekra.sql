CREATE TYPE "public"."social_platform" AS ENUM('whatsapp_status', 'x', 'facebook', 'instagram_story', 'instagram_bio', 'telegram');--> statement-breakpoint
CREATE TYPE "public"."paystack_payment_status" AS ENUM('pending', 'success', 'failed', 'abandoned');--> statement-breakpoint
CREATE TABLE "creator_socials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"handle" text NOT NULL,
	"follower_count" integer,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paystack_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"amount_kobo" bigint NOT NULL,
	"gross_kobo" bigint NOT NULL,
	"status" "paystack_payment_status" DEFAULT 'pending' NOT NULL,
	"paystack_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paystack_payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"amount" integer NOT NULL,
	"ref_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator_balance_cache" ALTER COLUMN "pending_kobo" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "creator_balance_cache" ALTER COLUMN "available_kobo" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "reserved_kobo" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "spent_kobo" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "vat_included_kobo" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "withdrawals" ALTER COLUMN "fee_kobo" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "niches" text[];--> statement-breakpoint
ALTER TABLE "creator_socials" ADD CONSTRAINT "creator_socials_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paystack_payments" ADD CONSTRAINT "paystack_payments_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;
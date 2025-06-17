CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"target_grade_level" integer DEFAULT 8,
	"writing_tone" text DEFAULT 'professional',
	"custom_dictionary" jsonb DEFAULT '[]'::jsonb,
	"ignored_suggestions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "author" text DEFAULT 'Anonymous' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "keywords" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "secondary_keywords" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "analysis_cache" jsonb;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "seo_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "readability_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "style_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "overall_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
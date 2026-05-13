CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_code" varchar(32) NOT NULL,
	"period" varchar(16) NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"provider" varchar(16) DEFAULT 'zpay' NOT NULL,
	"provider_pay_type" varchar(16),
	"provider_trade_no" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_plan_code_plan_code_fk" FOREIGN KEY ("plan_code") REFERENCES "public"."plan"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_user_status_idx" ON "order" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "order_status_expires_idx" ON "order" USING btree ("status","expires_at");
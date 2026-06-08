CREATE TABLE "inbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"conversation_id" uuid,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inbox_events" ADD CONSTRAINT "inbox_events_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbox_events_created_at_idx" ON "inbox_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inbox_events_conversation_created_at_idx" ON "inbox_events" USING btree ("conversation_id","created_at");
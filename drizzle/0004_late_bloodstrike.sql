CREATE INDEX "jobs_status_scheduled_at_idx" ON "jobs" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "jobs_type_status_scheduled_at_idx" ON "jobs" USING btree ("type","status","scheduled_at");--> statement-breakpoint
CREATE INDEX "webhook_events_status_created_at_idx" ON "webhook_events" USING btree ("status","created_at");
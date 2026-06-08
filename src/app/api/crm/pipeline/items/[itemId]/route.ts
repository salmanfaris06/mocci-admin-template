import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import { pipelineItems } from "@/server/db/schema";

const updatePipelineItemSchema = z.object({
  stageId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: true, demo: true });
  }

  const { itemId } = await params;
  const body = updatePipelineItemSchema.safeParse(await request.json());
  if (!body.success) {
    return Response.json({ error: "Invalid pipeline update payload", issues: body.error.flatten() }, { status: 400 });
  }

  const [item] = await db
    .update(pipelineItems)
    .set({
      stageId: body.data.stageId,
      position: body.data.position ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(pipelineItems.id, itemId))
    .returning({ id: pipelineItems.id, stageId: pipelineItems.stageId, position: pipelineItems.position });

  if (!item) {
    return Response.json({ error: "Pipeline item not found" }, { status: 404 });
  }

  revalidatePath("/pipeline");
  revalidatePath("/crm/pipeline");
  revalidatePath("/contacts");
  revalidatePath("/crm/contacts");

  return Response.json({ item });
}

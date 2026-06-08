import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import { contacts } from "@/server/db/schema";

const updateContactSchema = z.object({
  status: z.string().min(1).max(64).optional(),
  tags: z.array(z.string().min(1).max(48)).max(12).optional(),
  notes: z.string().max(4000).nullable().optional(),
  aiEnabled: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ contactId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: true, demo: true });
  }

  const { contactId } = await params;
  const body = updateContactSchema.safeParse(await request.json());
  if (!body.success) {
    return Response.json({ error: "Invalid contact update payload", issues: body.error.flatten() }, { status: 400 });
  }

  const [contact] = await db
    .update(contacts)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(contacts.id, contactId))
    .returning({ id: contacts.id, status: contacts.status, tags: contacts.tags, notes: contacts.notes, aiEnabled: contacts.aiEnabled });

  if (!contact) {
    return Response.json({ error: "Contact not found" }, { status: 404 });
  }

  revalidatePath("/contacts");
  revalidatePath("/crm/contacts");
  revalidatePath("/pipeline");
  revalidatePath("/crm/pipeline");

  return Response.json({ contact });
}

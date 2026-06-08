export type ContactEditForm = {
  status: string;
  tagsInput: string;
  notes: string;
};

export type ContactUpdatePayload = {
  status?: string;
  tags?: string[];
  notes?: string | null;
};

export type ContactCurrentValues = {
  status: string;
  tags: string[];
  notes: string | null;
};

export function parseTagsInput(tagsInput: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawTag of tagsInput.split(",")) {
    const tag = rawTag.trim();
    if (!tag) continue;

    const key = tag.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

function normalizeNotes(notes: string): string | null {
  const trimmed = notes.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildContactUpdatePayload(
  form: ContactEditForm,
  current: ContactCurrentValues,
): ContactUpdatePayload {
  const payload: ContactUpdatePayload = {};
  const status = form.status.trim();

  if (status && status !== current.status) {
    payload.status = status;
  }

  const tags = parseTagsInput(form.tagsInput);
  const currentTags = current.tags ?? [];
  const tagsChanged =
    tags.length !== currentTags.length ||
    tags.some((tag, index) => tag !== currentTags[index]);

  if (tagsChanged) {
    payload.tags = tags;
  }

  const notes = normalizeNotes(form.notes);
  if (notes !== (current.notes ?? null)) {
    payload.notes = notes;
  }

  return payload;
}

export function hasContactChanges(payload: ContactUpdatePayload): boolean {
  return Object.keys(payload).length > 0;
}

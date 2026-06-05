function readPath(value: unknown, path: string[]) {
  let cursor = value;

  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

function readBooleanLike(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return false;
}

export function getEvolutionIsFromMe(payload: unknown) {
  return readBooleanLike(
    readPath(payload, ["raw", "data", "key", "fromMe"]) ??
      readPath(payload, ["raw", "key", "fromMe"]) ??
      readPath(payload, ["data", "key", "fromMe"]) ??
      readPath(payload, ["key", "fromMe"]),
  );
}

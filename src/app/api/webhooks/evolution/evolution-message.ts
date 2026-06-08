function readPath(value: unknown, path: string[]) {
  let cursor = value;

  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

function readString(value: unknown, paths: string[][]) {
  for (const path of paths) {
    const result = readPath(value, path);
    if (typeof result === "string" && result.trim()) return result.trim();
  }
  return undefined;
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

export function getEvolutionMessageId(payload: unknown) {
  return readString(payload, [
    ["raw", "data", "key", "id"],
    ["raw", "data", "id"],
    ["data", "key", "id"],
    ["data", "id"],
    ["key", "id"],
    ["id"],
  ]);
}

export function getEvolutionAckStatus(payload: unknown) {
  return readString(payload, [
    ["raw", "data", "status"],
    ["raw", "data", "update", "status"],
    ["raw", "status"],
    ["data", "status"],
    ["data", "update", "status"],
    ["status"],
    ["update", "status"],
  ]);
}

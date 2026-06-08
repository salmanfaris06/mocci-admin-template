type WhatsAppNumberClient = {
  checkWhatsAppNumbers(numbers: string[]): Promise<unknown>;
};

type ValidateWhatsAppNumbersOptions = {
  batchSize?: number;
};

type WhatsAppNumberResult = {
  input: string;
  number: string;
  exists: boolean;
};

function normalizeWhatsAppNumber(input: string) {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  if (!/^62\d{8,15}$/.test(normalized))
    throw new Error(`Invalid WhatsApp number: ${input}`);
  return normalized;
}

function asArray(response: unknown) {
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    if (Array.isArray(record.numbers)) return record.numbers;
    if (Array.isArray(record.data)) return record.data;
  }
  return [];
}

function readNumberResult(row: unknown) {
  if (!row || typeof row !== "object") return undefined;
  const record = row as Record<string, unknown>;
  const number =
    typeof record.number === "string"
      ? record.number
      : typeof record.jid === "string"
        ? record.jid.split("@")[0]
        : undefined;
  const exists =
    record.exists === true ||
    record.isWhatsapp === true ||
    record.isWhatsApp === true;
  if (!number) return undefined;
  return { number, exists };
}

export async function validateWhatsAppNumbers(
  client: WhatsAppNumberClient,
  inputs: string[],
  options: ValidateWhatsAppNumbersOptions = {},
): Promise<WhatsAppNumberResult[]> {
  const batchSize = Math.min(Math.max(options.batchSize ?? 50, 1), 100);
  const normalized = inputs.map((input) => ({
    input,
    number: normalizeWhatsAppNumber(input),
  }));
  const existsByNumber = new Map<string, boolean>();

  for (let index = 0; index < normalized.length; index += batchSize) {
    const batch = normalized.slice(index, index + batchSize);
    const response = await client.checkWhatsAppNumbers(
      batch.map((item) => item.number),
    );
    for (const row of asArray(response)) {
      const result = readNumberResult(row);
      if (result) existsByNumber.set(result.number, result.exists);
    }
  }

  return normalized.map(({ input, number }) => ({
    input,
    number,
    exists: existsByNumber.get(number) ?? false,
  }));
}

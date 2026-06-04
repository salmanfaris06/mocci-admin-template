export function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message.includes("EVOLUTION_BASE_URL")) return "EVOLUTION_BASE_URL is missing. Fill Base URL + API key in settings or add it to Vercel env.";
  if (message.includes("EVOLUTION_API_KEY")) return "Evolution API key is missing. Fill the API key field and save settings, or add EVOLUTION_API_KEY to Vercel env.";
  if (message.includes("EVOLUTION_INSTANCE_NAME")) return "Evolution instance name is missing. Fill Instance name in settings or add EVOLUTION_INSTANCE_NAME to Vercel env.";
  if (message.includes("Evolution API request failed")) return message;
  if (message.includes("Unsupported state") || message.includes("decrypt")) return "Saved Evolution API key cannot be decrypted in this environment. Use the same SECRETS_ENCRYPTION_KEY as the environment that saved it, or re-save the API key in production.";
  if (message.includes("SECRETS_ENCRYPTION_KEY")) return "SECRETS_ENCRYPTION_KEY is missing or invalid in Vercel env.";

  return "WhatsApp action failed. Check Vercel env and Evolution API settings.";
}

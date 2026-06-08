import "server-only";

import { fetchAllInstances } from "./evolution";

export type WhatsAppConnection =
  | { status: "not-configured" }
  | { status: "no-instance"; instanceName: string }
  | { status: "connected"; instanceName: string; state: string }
  | { status: "disconnected"; instanceName: string; state: string }
  | { status: "unknown"; instanceName: string };

export function isConnectedState(state: string) {
  const normalizedState = state.toLowerCase();
  return (
    normalizedState === "open" ||
    normalizedState === "connected" ||
    normalizedState === "connect"
  );
}

export async function getWhatsAppConnection(): Promise<WhatsAppConnection> {
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME?.trim();
  const evolutionConfigured = Boolean(
    process.env.EVOLUTION_BASE_URL &&
    instanceName &&
    process.env.EVOLUTION_API_KEY,
  );

  if (!evolutionConfigured || !instanceName)
    return { status: "not-configured" };

  try {
    const instances = await fetchAllInstances();
    const instance = instances.find(
      (candidate) => candidate.name === instanceName,
    );

    if (!instance) return { status: "no-instance", instanceName };
    if (isConnectedState(instance.state))
      return { status: "connected", instanceName, state: instance.state };

    return { status: "disconnected", instanceName, state: instance.state };
  } catch {
    return { status: "unknown", instanceName };
  }
}

export function canShowWhatsAppCrmData(connection: WhatsAppConnection) {
  return connection.status === "connected";
}

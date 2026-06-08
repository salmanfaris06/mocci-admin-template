"use client";

import { Loader2Icon, LogOutIcon, QrCodeIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import * as QRCode from "qrcode";
import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { connectWhatsAppInstance, createWhatsAppInstance, deleteWhatsApp, disconnectWhatsApp, testEvolutionSettings } from "./actions";

type WhatsAppLoginCardProps = {
  initialConnectionState: string;
};

type QrState = {
  image?: string;
  code?: string;
  pairingCode?: string;
  raw?: unknown;
};

type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

type ConnectionInfo = {
  state: string;
  number?: string;
  connectedAt?: Date;
};

function stringifyState(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function readStringField(value: unknown, paths: string[][]) {
  for (const path of paths) {
    let cursor = value;
    for (const segment of path) {
      if (!cursor || typeof cursor !== "object" || !(segment in cursor)) {
        cursor = undefined;
        break;
      }
      cursor = (cursor as Record<string, unknown>)[segment];
    }
    if (typeof cursor === "string" && cursor.trim()) return cursor.trim();
  }
  return undefined;
}

function normalizePhone(value?: string) {
  if (!value) return undefined;
  const number = value.split("@")[0]?.replace(/\D/g, "");
  return number ? `+${number}` : value;
}

function getConnectionInfo(value: string, connectedAt?: Date): ConnectionInfo {
  const parsed = tryParseJson(value);
  const state =
    readStringField(parsed, [["state"], ["instance", "state"], ["connectionState", "state"], ["connectionState", "instance", "state"], ["status"]]) ??
    (typeof parsed === "string" ? parsed : "unknown");
  const number = normalizePhone(
    readStringField(parsed, [
      ["instance", "ownerJid"],
      ["ownerJid"],
      ["instance", "number"],
      ["number"],
      ["profile", "id"],
      ["connectionState", "instance", "ownerJid"],
      ["connectionState", "ownerJid"],
      ["connectionState", "instance", "number"],
      ["instance", "owner"],
      ["instance", "profile", "id"],
    ])
  );

  return { state, number, connectedAt };
}

function isConnectedState(state: string) {
  const normalized = state.toLowerCase();
  return normalized === "open" || normalized === "connected" || normalized === "connect";
}

function formatConnectedAt(date?: Date) {
  return date
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "Just now";
}

export function WhatsAppLoginCard({ initialConnectionState }: WhatsAppLoginCardProps) {
  const [connectionState, setConnectionState] = React.useState(initialConnectionState);
  const [connectedAt, setConnectedAt] = React.useState<Date>();
  const [qr, setQr] = React.useState<QrState | null>(null);
  const [renderedQr, setRenderedQr] = React.useState<{ code: string; dataUrl: string }>();
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const connectionInfo = React.useMemo(() => getConnectionInfo(connectionState, connectedAt), [connectionState, connectedAt]);
  const isConnected = isConnectedState(connectionInfo.state);

  const updateConnectionState = React.useCallback((value: unknown) => {
    const nextState = stringifyState(value);
    const nextInfo = getConnectionInfo(nextState);
    setConnectionState(nextState);
    if (isConnectedState(nextInfo.state)) {
      setConnectedAt((current) => current ?? new Date());
      setQr(null);
      setRenderedQr(undefined);
    }
  }, []);

  const runAction = React.useCallback((action: () => Promise<ActionResult>, onSuccess?: (value: unknown) => void) => {
    setError(null);
    startTransition(() => {
      void action()
        .then((result) => {
          if (!result.ok) {
            setError(result.error);
            return;
          }
          onSuccess?.(result.data);
        })
        .catch((actionError) => {
          setError(actionError instanceof Error ? actionError.message : "WhatsApp action failed");
        });
    });
  }, []);

  const handleCreate = React.useCallback(() => {
    runAction(createWhatsAppInstance, (value) => {
      const qrValue = value as QrState;
      if (qrValue.image || qrValue.code || qrValue.pairingCode) {
        setQr({ image: qrValue.image, code: qrValue.code, pairingCode: qrValue.pairingCode, raw: qrValue.raw });
      }
    });
  }, [runAction]);

  const handleConnect = React.useCallback(() => {
    runAction(connectWhatsAppInstance, (value) => {
      const qrValue = value as QrState;
      if (!qrValue.image && !qrValue.code && !qrValue.pairingCode) {
        setError(`Evolution connected endpoint did not return QR data. Raw response: ${JSON.stringify(qrValue.raw ?? value)}`);
        return;
      }
      setQr({ image: qrValue.image, code: qrValue.code, pairingCode: qrValue.pairingCode, raw: qrValue.raw });
    });
  }, [runAction]);

  const handleRefresh = React.useCallback(() => {
    runAction(testEvolutionSettings, updateConnectionState);
  }, [runAction, updateConnectionState]);

  const handleDisconnect = React.useCallback(() => {
    runAction(disconnectWhatsApp, () => {
      setQr(null);
      setConnectionState("disconnected");
      setConnectedAt(undefined);
    });
  }, [runAction]);

  const handleDelete = React.useCallback(() => {
    if (!window.confirm("Delete this WhatsApp instance permanently? All session data will be lost and you will need to create a new instance and scan QR again.")) return;

    runAction(deleteWhatsApp, () => {
      setQr(null);
      setConnectionState("deleted");
      setConnectedAt(undefined);
    });
  }, [runAction]);

  React.useEffect(() => {
    let cancelled = false;

    if (!qr?.image && qr?.code) {
      void QRCode.toDataURL(qr.code, { margin: 1, width: 320 }).then((dataUrl) => {
        if (!cancelled) setRenderedQr({ code: qr.code!, dataUrl });
      });
    }

    return () => {
      cancelled = true;
    };
  }, [qr]);

  React.useEffect(() => {
    if (isConnected) return;

    const statusInterval = window.setInterval(() => {
      void testEvolutionSettings()
        .then((result) => {
          if (result.ok) updateConnectionState(result.data);
        })
        .catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(statusInterval);
  }, [isConnected, updateConnectionState]);

  React.useEffect(() => {
    if (!qr || isConnected) return;

    const qrInterval = window.setInterval(() => {
      void connectWhatsAppInstance()
        .then((value) => {
          const qrValue = value as QrState;
          if (qrValue.image || qrValue.code || qrValue.pairingCode) {
            setQr({ image: qrValue.image, code: qrValue.code, pairingCode: qrValue.pairingCode, raw: qrValue.raw });
          }
        })
        .catch(() => undefined);
    }, 25000);

    return () => window.clearInterval(qrInterval);
  }, [qr, isConnected]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Login</CardTitle>
        <CardDescription>Create an instance, scan the QR code from WhatsApp → Linked Devices, then monitor connection state.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button disabled={isPending || isConnected} onClick={handleCreate} type="button" variant="outline">
            {isPending ? <Loader2Icon className="animate-spin" data-icon /> : <RefreshCwIcon data-icon />}
            Create Instance
          </Button>
          <Button disabled={isPending || isConnected} onClick={handleConnect} type="button">
            {isPending ? <Loader2Icon className="animate-spin" data-icon /> : <QrCodeIcon data-icon />}
            Connect / QR
          </Button>
          <Button disabled={isPending} onClick={handleRefresh} type="button" variant="secondary">
            Refresh Status
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="font-medium">Connection state</div>
          <p className="mt-1 break-words text-muted-foreground">{connectionInfo.state}</p>
        </div>

        {isConnected ? (
          <Alert>
            <QrCodeIcon />
            <AlertTitle>WhatsApp connected</AlertTitle>
            <AlertDescription>
              <div className="mt-3 grid gap-3">
                <div className="grid gap-1">
                  <span>Number: {connectionInfo.number ?? "Connected number not returned by Evolution API"}</span>
                  <span>Connected at: {formatConnectedAt(connectionInfo.connectedAt)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={isPending} onClick={handleDisconnect} size="sm" type="button" variant="secondary">
                    {isPending ? <Loader2Icon className="animate-spin" data-icon /> : <LogOutIcon data-icon />}
                    Logout WhatsApp
                  </Button>
                  <Button disabled={isPending} onClick={handleDelete} size="sm" type="button" variant="destructive">
                    {isPending ? <Loader2Icon className="animate-spin" data-icon /> : <Trash2Icon data-icon />}
                    Delete Instance
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {!isConnected && qr ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-background p-4">
            {qr.image || (qr.code && renderedQr?.code === qr.code) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="WhatsApp login QR code" className="size-64 rounded-md border bg-white p-2" src={qr.image ?? renderedQr?.dataUrl} />
            ) : (
              <div className="grid size-64 place-items-center rounded-md border bg-muted text-muted-foreground text-sm">Preparing QR...</div>
            )}
            <p className="text-center text-muted-foreground text-sm">Open WhatsApp → Linked devices → Link a device, then scan this QR. The QR refreshes automatically.</p>
          </div>
        ) : null}

        {!isConnected && qr?.pairingCode ? (
          <Alert>
            <QrCodeIcon />
            <AlertTitle>Pairing code</AlertTitle>
            <AlertDescription>{qr.pairingCode}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>WhatsApp connection failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

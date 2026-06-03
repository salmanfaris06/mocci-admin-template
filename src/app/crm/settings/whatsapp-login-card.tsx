"use client";

import { Loader2Icon, QrCodeIcon, RefreshCwIcon } from "lucide-react";
import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { connectWhatsAppInstance, createWhatsAppInstance, testEvolutionSettings } from "./actions";

type WhatsAppLoginCardProps = {
  initialConnectionState: string;
};

type QrState = {
  image?: string;
  pairingCode?: string;
};

function stringifyState(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function WhatsAppLoginCard({ initialConnectionState }: WhatsAppLoginCardProps) {
  const [connectionState, setConnectionState] = React.useState(initialConnectionState);
  const [qr, setQr] = React.useState<QrState | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const runAction = React.useCallback((action: () => Promise<unknown>, onSuccess?: (value: unknown) => void) => {
    setError(null);
    startTransition(() => {
      void action()
        .then((value) => {
          onSuccess?.(value);
        })
        .catch((actionError) => {
          setError(actionError instanceof Error ? actionError.message : "WhatsApp action failed");
        });
    });
  }, []);

  const handleCreate = React.useCallback(() => {
    runAction(createWhatsAppInstance);
  }, [runAction]);

  const handleConnect = React.useCallback(() => {
    runAction(connectWhatsAppInstance, (value) => {
      const qrValue = value as QrState;
      setQr({ image: qrValue.image, pairingCode: qrValue.pairingCode });
    });
  }, [runAction]);

  const handleRefresh = React.useCallback(() => {
    runAction(testEvolutionSettings, (value) => {
      setConnectionState(stringifyState(value));
    });
  }, [runAction]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Login</CardTitle>
        <CardDescription>Create/connect your Evolution instance, then scan the QR from WhatsApp Linked devices.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button disabled={isPending} onClick={handleCreate} type="button" variant="outline">
            {isPending ? <Loader2Icon className="animate-spin" data-icon /> : <RefreshCwIcon data-icon />}
            Create instance
          </Button>
          <Button disabled={isPending} onClick={handleConnect} type="button">
            {isPending ? <Loader2Icon className="animate-spin" data-icon /> : <QrCodeIcon data-icon />}
            Get QR
          </Button>
          <Button disabled={isPending} onClick={handleRefresh} type="button" variant="secondary">
            Refresh status
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="font-medium">Connection state</div>
          <p className="mt-1 break-words text-muted-foreground">{connectionState}</p>
        </div>

        {qr?.image ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-background p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="WhatsApp login QR code" className="size-64 rounded-md border bg-white p-2" src={qr.image} />
            <p className="text-center text-muted-foreground text-sm">Open WhatsApp → Linked devices → Link a device, then scan this QR.</p>
          </div>
        ) : null}

        {qr?.pairingCode ? (
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

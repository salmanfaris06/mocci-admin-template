"use client";

import { AppProgressBar } from "next-nprogress-bar";

export function NavigationProgress() {
  return (
    <AppProgressBar
      height="2px"
      color="hsl(var(--primary))"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}

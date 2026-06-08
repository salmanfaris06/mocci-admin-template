import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { NavigationProgress } from "@/components/navigation-progress";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { themePresets } from "@/config/theme-presets";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Moccilabs",
    template: "%s · Moccilabs",
  },
  description:
    "A modern admin dashboard template built with Next.js, React, Tailwind CSS, and shadcn-style components.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  appleWebApp: {
    title: "Moccilabs",
  },
};

const presetMap = JSON.stringify(
  themePresets.reduce<
    Record<
      string,
      { light: string; lightFg: string; dark: string; darkFg: string }
    >
  >((acc, p) => {
    acc[p.name] = {
      light: p.light.primary,
      lightFg: p.light.primaryForeground,
      dark: p.dark.primary,
      darkFg: p.dark.primaryForeground,
    };
    return acc;
  }, {}),
);

const initScript = `
(function() {
  try {
    var p = localStorage.getItem('theme-preset') || 'neutral';
    var r = localStorage.getItem('theme-radius');
    var map = ${presetMap};
    var d = document.documentElement;
    d.dataset.themePreset = p;
    if (r) d.style.setProperty('--radius', r + 'rem');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: initScript }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <NavigationProgress />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

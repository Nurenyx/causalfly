import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./components/instrument-system.css";
import "./components/source-workspaces.css";
import "./components/guided-workflow.css";
import "./components/guided-experiment.css";
import "./components/embodied-experiment.css";
import "./components/perception-panel.css";
import "./components/experiment-trust.css";
import "./components/research-cockpit.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CausalFly | Causal Observatory",
  description: "A deterministic synthetic experiment observatory. Measured evidence, clearly separated from AI interpretation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

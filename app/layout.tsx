import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mouoj — Dubai City Guide",
  description: "Voice-first, hyper-filtered city guide for Dubai",
};

// Dynamically import ConvexClientProvider with SSR disabled
const ConvexClientProvider = dynamic(
  () => import("./ConvexClientProvider").then((mod) => mod.ConvexClientProvider),
  { ssr: false }
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}

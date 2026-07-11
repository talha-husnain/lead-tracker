import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans-var", display: "swap" });

export const metadata = {
  title: "Lead Tracker",
  description: "Your sales pipeline — leads, follow-ups, and deals in one place.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={sans.variable}>
      <body className="min-h-screen antialiased">
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@600,700,800&display=swap" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

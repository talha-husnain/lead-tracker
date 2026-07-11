import "./globals.css";
import { Space_Grotesk, Inter } from "next/font/google";
import { Providers } from "@/components/Providers";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display-var", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans-var", display: "swap" });

export const viewport = { themeColor: "#0A0A0A" };

export const metadata = {
  title: "Lead Tracker",
  description: "Intelligent software, engineered to scale.",
  applicationName: "Lead Tracker",
  appleWebApp: { capable: true, title: "Lead Tracker", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import "./globals.css";
import { Space_Grotesk, Inter } from "next/font/google";
import { Providers } from "@/components/Providers";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display-var", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans-var", display: "swap" });

export const metadata = {
  title: "Lead Tracker",
  description: "Intelligent software, engineered to scale.",
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

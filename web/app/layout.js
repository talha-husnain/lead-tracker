import "./globals.css";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display-var", display: "swap" });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans-var", display: "swap" });

export const metadata = {
  title: "Lead Tracker",
  description: "Your sales pipeline — leads, follow-ups, and deals in one place.",
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

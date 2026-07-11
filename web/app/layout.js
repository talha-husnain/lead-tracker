import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata = {
  title: "Lead Tracker",
  description: "Your sales pipeline — leads, follow-ups, and deals in one place.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

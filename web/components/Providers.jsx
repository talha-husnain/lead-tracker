"use client";
import { StoreProvider } from "@/lib/store";
import { ToasterProvider } from "@/components/ui/toast";

export function Providers({ children }) {
  return (
    <StoreProvider>
      <ToasterProvider>{children}</ToasterProvider>
    </StoreProvider>
  );
}

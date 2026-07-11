"use client";
import { StoreProvider } from "@/lib/store";
import { ToasterProvider } from "@/components/ui/toast";
import { PwaProvider } from "@/components/PwaProvider";

export function Providers({ children }) {
  return (
    <StoreProvider>
      <PwaProvider>
        <ToasterProvider>{children}</ToasterProvider>
      </PwaProvider>
    </StoreProvider>
  );
}

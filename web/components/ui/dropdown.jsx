"use client";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function DropdownMenu({ trigger, children, align = "end" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={cn("absolute z-50 mt-1 min-w-[220px] rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg", align === "end" ? "right-0" : "left-0")}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick, danger, className }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent", danger && "text-destructive", className)}
    >
      {children}
    </button>
  );
}

export function DropdownSep() {
  return <div className="my-1 h-px bg-border" />;
}

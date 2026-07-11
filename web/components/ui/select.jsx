import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

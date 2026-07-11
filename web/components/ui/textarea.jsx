import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-input bg-transparent px-3.5 py-2.5 text-sm shadow-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

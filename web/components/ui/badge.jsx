import { cn } from "@/lib/utils";

export function Badge({ className, style, children, ...props }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", className)}
      style={style}
      {...props}
    >
      {children}
    </span>
  );
}

export function Dot({ color, className }) {
  return <span className={cn("inline-block size-2 rounded-full", className)} style={{ backgroundColor: color }} />;
}

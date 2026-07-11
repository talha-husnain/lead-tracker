import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
  return <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...props} />;
}
export function CardHeader({ className, ...props }) {
  return <div className={cn("flex items-center justify-between gap-2 p-5 pb-3", className)} {...props} />;
}
export function CardTitle({ className, ...props }) {
  return <div className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", className)} {...props} />;
}
export function CardContent({ className, ...props }) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

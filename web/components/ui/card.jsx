import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn("rounded-2xl border border-border/70 bg-card text-card-foreground card-elev", className)}
      {...props}
    />
  );
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

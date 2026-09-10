import { WifiOff, Loader } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiStatusBadgeProps {
  online: boolean | null;
  className?: string;
}

export function ApiStatusBadge({ online, className }: ApiStatusBadgeProps) {
  if (online === null) {
    return (
      <span className={cn("flex items-center gap-1.5 rounded border border-command-border bg-command/50 px-2 py-1 text-[9px] font-semibold tracking-[0.12em] text-muted-foreground", className)}>
        <Loader size={11} className="animate-spin" />
        <span className="hidden sm:inline">CONNECTING</span>
      </span>
    );
  }

  if (online) {
    return (
      <span className={cn("flex items-center gap-1.5 rounded border border-command-green/25 bg-command-green/8 px-2 py-1 text-[9px] font-semibold tracking-[0.12em] text-command-green", className)}>
        <span className="status-pulse size-1.5 rounded-full bg-command-green" />
        <span className="hidden sm:inline">AI ENGINE CONNECTED</span>
      </span>
    );
  }

  return (
    <span
      className={cn("flex items-center gap-1.5 rounded border border-command-amber/25 bg-command-amber/8 px-2 py-1 text-[9px] font-semibold tracking-[0.12em] text-command-amber", className)}
      title="Backend unavailable — using cached data"
    >
      <WifiOff size={11} />
      <span className="hidden sm:inline">OFFLINE MODE</span>
    </span>
  );
}

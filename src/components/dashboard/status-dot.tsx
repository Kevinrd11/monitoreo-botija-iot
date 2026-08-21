import { cn } from "@/lib/utils";
import { TONE, type Tone } from "./tone";

interface StatusDotProps {
  tone: Tone;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = { sm: "size-2", md: "size-2.5", lg: "size-3.5" } as const;

/** LED de estado: punto solido con halo opcional que late. */
export function StatusDot({ tone, pulse = false, size = "md", className }: StatusDotProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", SIZE[size], className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-60 animate-status-pulse",
            TONE[tone].dot,
          )}
        />
      )}
      <span className={cn("relative inline-flex size-full rounded-full", TONE[tone].dot)} />
    </span>
  );
}

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "neutral" | "success" | "warn" | "danger";

const tones: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-green-100 text-green-800",
  warn: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

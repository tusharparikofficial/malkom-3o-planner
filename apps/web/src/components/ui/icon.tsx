import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  className?: string;
}

/** Google Material Symbols (Rounded), self-hosted via the material-symbols package. */
export function Icon({ name, className }: IconProps) {
  return (
    <span aria-hidden className={cn("material-symbols-rounded select-none", className)}>
      {name}
    </span>
  );
}

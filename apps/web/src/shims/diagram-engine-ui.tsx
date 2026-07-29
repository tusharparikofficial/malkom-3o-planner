/**
 * Stand-ins for diagram-engine's unpublished app-shell components.
 * The package ships only src/engine/, whose inspector panels import
 * `@/components/ui/button` and `@/components/ui/input` from its own app.
 * The vite config routes those engine-internal imports here.
 */
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from "react";

type ShimButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  size?: string;
};

export const Button = forwardRef<HTMLButtonElement, ShimButtonProps>(
  ({ className, variant, size: _size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={[
        "inline-flex items-center justify-center gap-1 rounded border px-2.5 py-1 text-xs font-medium transition-colors",
        variant === "destructive"
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        className ?? "",
      ].join(" ")}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={[
        "w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-primary focus:outline-none",
        className ?? "",
      ].join(" ")}
      {...props}
    />
  ),
);
Input.displayName = "Input";

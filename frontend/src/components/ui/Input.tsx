import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface InputProps extends Omit<ComponentPropsWithoutRef<"input">, "className"> {
  label?: ReactNode;
  error?: ReactNode;
  icon?: LucideIcon;
  rightIcon?: ReactNode;
  className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, rightIcon, className = "", type = "text", ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon size={15} />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            "w-full rounded-lg border border-slate-200 bg-white",
            "px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400",
            "transition-all outline-none",
            "hover:border-slate-300",
            "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50",
            Icon     && "pl-9",
            rightIcon && "pr-10",
            error    && "border-red-400 focus:border-red-500 focus:ring-red-500/15",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightIcon}</div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">{error}</p>}
    </div>
  );
});
Input.displayName = "Input";
export default Input;

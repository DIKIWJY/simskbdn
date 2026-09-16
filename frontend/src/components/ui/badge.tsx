import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-blue-600 text-white",
        secondary:   "border-transparent bg-slate-100 text-slate-700",
        destructive: "border-transparent bg-red-100 text-red-700 border-red-200",
        success:     "border-transparent bg-emerald-100 text-emerald-700 border-emerald-200",
        warning:     "border-transparent bg-amber-100 text-amber-700 border-amber-200",
        outline:     "border-slate-200 text-slate-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps extends ComponentPropsWithoutRef<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import Spinner from "./Spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:   "bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-[0.98]",
        outline:   "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300",
        danger:    "bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[0.98]",
        ghost:     "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        success:   "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
      },
      size: {
        sm:   "h-8  px-3 text-xs rounded-md",
        md:   "h-9  px-4 text-sm",
        lg:   "h-10 px-6 text-sm",
        icon: "h-9  w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

interface ButtonProps
  extends ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  asChild = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </Comp>
  );
}

export { buttonVariants };

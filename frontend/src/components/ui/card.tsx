import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("bg-white rounded-xl border border-slate-200 shadow-sm", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("flex flex-col space-y-1 p-5 pb-3", className)} {...props} />;
}

function CardTitle({ className, ...props }: ComponentPropsWithoutRef<"h3">) {
  return <h3 className={cn("text-base font-semibold text-slate-900 leading-tight", className)} {...props} />;
}

function CardDescription({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("text-sm text-slate-500", className)} {...props} />;
}

function CardContent({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}

function CardFooter({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex items-center p-5 pt-0", className)} {...props} />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

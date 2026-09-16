import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabung Tailwind class dengan aman — merge conflict otomatis diselesaikan */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

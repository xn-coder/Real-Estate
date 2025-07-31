import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUserId(prefix: string): string {
  const randomNumber = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
  return `${prefix}${randomNumber}`;
}

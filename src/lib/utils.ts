import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUserId(prefix: string): string {
  const randomNumber = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
  return `${prefix}${randomNumber}`;
}

export function formatIndianCurrency(amount: number): string {
    if (amount >= 10000000) {
        return (amount / 10000000).toFixed(2) + 'Cr';
    }
    if (amount >= 100000) {
        return (amount / 100000).toFixed(2) + 'L';
    }
    if (amount >= 1000) {
        return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toString();
}

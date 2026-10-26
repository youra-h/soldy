import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn/ui's `cn` (`lib/utils.ts`): conditional classes merged by Tailwind's rules. */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

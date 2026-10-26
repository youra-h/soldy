import type { ReactNode } from 'react'
import './styles.css'

/**
 * shadcn/ui as an application sets it up: no provider — the components are
 * copied into the app — and the app's Tailwind sheet (`globals.css` compiled
 * by `tailwind.mjs` into `styles.css`). Tooltips bring their own provider, as
 * shadcn's `tooltip.tsx` does.
 */
export function Root({ children }: { children?: ReactNode }) {
	return <>{children}</>
}

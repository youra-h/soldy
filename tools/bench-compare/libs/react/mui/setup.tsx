import type { ReactNode } from 'react'

/** MUI needs no provider: the default theme comes with the components, styles are Emotion's. */
export function Root({ children }: { children?: ReactNode }) {
	return <>{children}</>
}

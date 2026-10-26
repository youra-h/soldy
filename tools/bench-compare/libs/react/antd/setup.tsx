import type { ReactNode } from 'react'

/**
 * Ant Design needs no provider and no stylesheet: the default theme comes with
 * the components, styles are CSS-in-JS. `ConfigProvider` is only for changing
 * the defaults, and the stand keeps them.
 */
export function Root({ children }: { children?: ReactNode }) {
	return <>{children}</>
}

import type { JSX } from 'solid-js'

/**
 * Kobalte is headless: no provider, no theme, no stylesheet — a page is the
 * library's parts as they ship. solid-ui styles the same parts with Tailwind
 * classes copied into the application (it is not a package), so the stand
 * takes Kobalte unstyled (benchmarks/compare/solid.md).
 */
export function Root(props: { children?: JSX.Element }) {
	return <>{props.children}</>
}

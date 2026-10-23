import type { Snippet } from 'svelte'

export type TTeleportProps = {
	/** Селектор цели: `body`, `#layers`. */
	to: string | undefined
	/** Рисовать на месте, без портала. */
	disabled?: boolean
	children?: Snippet
}

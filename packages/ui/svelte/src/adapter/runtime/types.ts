import type { Snippet } from 'svelte'

/** Пропсы `Teleport`. */
export type TTeleportProps = {
	/** Селектор цели: `body`, `#layers`. */
	to: string | undefined
	/** Рисовать на месте, без портала */
	disabled?: boolean
	children?: Snippet
}

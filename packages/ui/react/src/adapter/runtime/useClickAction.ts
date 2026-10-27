/**
 * useClickAction — the action of a part on a click (activate a tab, choose an
 * option, close a panel): a ref for the part's node.
 * AGENTS.md (React), «Клик части».
 */

import { useState } from 'react'
import { TClickAction } from './click-action.class'

export function useClickAction(action: (event: Event) => void): (node: Element | null) => void {
	const [click] = useState(() => new TClickAction())

	click.update(action)

	return click.ref
}

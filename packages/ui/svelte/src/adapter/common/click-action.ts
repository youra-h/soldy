/**
 * The action of a part on a click (activate a tab, choose an option, close a
 * panel) — a native listener on the part's node, given as its attachment
 * (`{@attach}`). AGENTS.md (Svelte), «Клик части».
 */

import type { Attachment } from 'svelte/attachments'

export function clickAction(action: (event: Event) => void): Attachment<Element> {
	return (node) => {
		node.addEventListener('click', action)

		return () => node.removeEventListener('click', action)
	}
}

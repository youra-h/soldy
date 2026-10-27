/**
 * The action of a part on a click (activate a tab, choose an option, close a
 * panel) — a native listener on the part's node, given as its `ref`.
 * AGENTS.md (Solid), «Клик части».
 */
export function clickAction(action: (event: Event) => void): (node: Element) => void {
	return (node) => node.addEventListener('click', action)
}

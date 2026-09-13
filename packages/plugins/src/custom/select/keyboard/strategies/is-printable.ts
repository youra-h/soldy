/** Печатный символ, а не сочетание с модификатором. */
export function isPrintableKey(e: KeyboardEvent): boolean {
	return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey
}

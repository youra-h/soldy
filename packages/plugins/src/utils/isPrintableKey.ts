/**
 * Печатный символ, а не сочетание с модификатором.
 *
 * В общих утилитах, а не у клавиатуры Select: набор по первым буквам ведут и
 * комбобокс, и меню (`packages/plugins/src/custom/list/typeahead.ts`).
 */
export function isPrintableKey(e: KeyboardEvent): boolean {
	return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey
}
